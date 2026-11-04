# The bucket and CDN for spoken audio: clips the `speech` function makes with
# Google, and clips scripts/pregen-speech.mjs records with Kokoro ahead of time.
# See README.md for the workflow.
#
# Public audio, private bucket. Every clip is the same for everyone and named
# by the hash of what it says, so it can be served openly and cached forever —
# but through CloudFront, the only reader the bucket allows (Origin Access
# Control). Not signed URLs as in happy-record's media bucket: those need a
# server call before every play, which is the cost this bucket exists to cut.
#
# Unlike happy-record, this creates the bucket too: there was none to adopt.
# `prevent_destroy` keeps it one deliberate edit away from deletion — the clips
# can be re-recorded, but that's hours of work and Google characters.

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Credentials come from the environment, not a `profile` here: the provider
# can't read an `aws login` session, so the npm scripts export the `voca`
# profile's session first (`aws configure export-credentials`).
provider "aws" {
  region              = var.aws_region
  allowed_account_ids = [var.allowed_account_id]
}

resource "aws_s3_bucket" "audio" {
  bucket = var.bucket_name

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_public_access_block" "audio" {
  bucket                  = aws_s3_bucket.audio.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "audio" {
  bucket = aws_s3_bucket.audio.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "audio" {
  bucket = aws_s3_bucket.audio.id

  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"
    filter {}
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# ─── CloudFront ────────────────────────────────────────────────────

resource "aws_cloudfront_origin_access_control" "audio" {
  name                              = "${var.bucket_name}-oac"
  description                       = "CloudFront reading the private audio bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# AWS-managed policies: cache by path only (the clip names never change), and
# Access-Control-Allow-Origin: * so the app can fetch() a clip into its
# on-device cache, not just play it.
data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_response_headers_policy" "cors" {
  name = "Managed-SimpleCORS"
}

resource "aws_cloudfront_distribution" "audio" {
  enabled         = true
  comment         = "Voca spoken audio"
  price_class     = var.price_class
  is_ipv6_enabled = true
  http_version    = "http2and3"

  origin {
    origin_id                = "audio-s3"
    domain_name              = aws_s3_bucket.audio.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.audio.id
  }

  default_cache_behavior {
    target_origin_id           = "audio-s3"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = false # MP3 is already compressed
    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.cors.id
  }

  # A miss must not be remembered: the speech function makes a clip moments
  # after someone asked for it, and a cached 404 would hide the new file.
  custom_error_response {
    error_code            = 403
    error_caching_min_ttl = 0
  }
  custom_error_response {
    error_code            = 404
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# Only this distribution may read objects; ListBucket makes a missing clip a
# 404 rather than a 403, so a miss reads as a miss.
resource "aws_s3_bucket_policy" "audio" {
  bucket = aws_s3_bucket.audio.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "CloudFrontReadsAudio"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = ["s3:GetObject", "s3:ListBucket"]
        Resource  = [aws_s3_bucket.audio.arn, "${aws_s3_bucket.audio.arn}/*"]
        Condition = {
          StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.audio.arn }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.audio]
}

# ─── The speech function's identity ────────────────────────────────

# What the `speech` edge function signs in as (AUDIO_S3_ACCESS_KEY_ID /
# AUDIO_S3_SECRET_ACCESS_KEY in `supabase secrets`). Its access key is made by
# hand — see README.md. The recording script uses your own `aws login`
# instead, so this user needs nothing beyond what the function does.
resource "aws_iam_user" "speech_writer" {
  name = "voca-speech-writer"
}

# Put a new clip, and Get — which is also what HeadObject needs — to check
# whether a clip exists without going through the CDN. Nothing else, and no
# other bucket.
resource "aws_iam_user_policy" "speech_writer" {
  name = "voca-speech-object-access"
  user = aws_iam_user.speech_writer.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "VocaSpeechObjectAccess"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = "${aws_s3_bucket.audio.arn}/*"
      }
    ]
  })
}

output "cdn_url" {
  description = "Base URL clips are served from (AUDIO_CDN_URL)."
  value       = "https://${aws_cloudfront_distribution.audio.domain_name}"
}

output "bucket" {
  value = aws_s3_bucket.audio.id
}
