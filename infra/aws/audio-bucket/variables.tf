variable "aws_region" {
  description = "Region the bucket lives in (matches AUDIO_S3_REGION for the speech function)."
  type        = string
  default     = "ap-southeast-2"
}

variable "bucket_name" {
  description = "The audio bucket (matches AUDIO_S3_BUCKET). Globally unique across AWS."
  type        = string
}

variable "price_class" {
  description = <<-EOT
    CloudFront edge locations to serve from. PriceClass_200 adds Asia to North
    America and Europe — learners are mostly in Vietnam, so _100 would route
    them to far-away edges. Within the free tier the class doesn't change cost.
  EOT
  type        = string
  default     = "PriceClass_200"
}
