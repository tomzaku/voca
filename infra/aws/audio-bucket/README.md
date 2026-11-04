# Audio bucket (Terraform)

S3 + CloudFront for spoken audio: the clips the `speech` edge function makes
with Google, and the ones `scripts/pregen-speech.mjs` records with Kokoro ahead
of time. Same layout as happy-record's `infra/aws/media-bucket`, with one
difference — see the header of `main.tf`: the bucket is private but the audio
is public, served through CloudFront rather than signed URLs.

Requires `terraform` (`brew install hashicorp/tap/terraform`) and `aws` signed
in (`aws login`) as an identity that can administer S3, CloudFront and IAM.

## First time

```bash
cp infra/aws/audio-bucket/terraform.tfvars.example infra/aws/audio-bucket/terraform.tfvars
npm run infra:audio:init
npm run infra:audio:plan     # review: a bucket, a distribution, an IAM user
npm run infra:audio:apply
```

`apply` prints `cdn_url` — the base every clip is served from. CloudFront takes
a few minutes to deploy before that URL answers.

Then give the `speech` function its key. AWS shows a secret exactly once, so
this is a hand-run step rather than a Terraform resource (the same reasoning as
happy-record's README):

```bash
aws iam create-access-key --user-name voca-speech-writer
supabase secrets set AUDIO_S3_BUCKET=trile-voca-audio AUDIO_S3_REGION=ap-southeast-2 \
  AUDIO_CDN_URL=<cdn_url> AUDIO_S3_ACCESS_KEY_ID=<AccessKeyId> AUDIO_S3_SECRET_ACCESS_KEY=<SecretAccessKey>
```

Put the same values in `supabase/functions/.env` for local runs.

Rotating: create a second key, set the secrets, confirm the speaker still
works, then `aws iam delete-access-key --user-name voca-speech-writer
--access-key-id <old>`.

## Day to day

Edit `main.tf` / `variables.tf`, then `npm run infra:audio:plan` and
`npm run infra:audio:apply`. State is local (`terraform.tfstate`, gitignored) —
keep it; without it Terraform no longer knows it owns these resources.

## Cost

Within the free tier at Voca's size: S3 storage is a few hundred MB, CloudFront
includes 1 TB out and 10M requests a month. The bucket's lifecycle rule only
clears abandoned multipart uploads; clips are never expired, because each one
is paid for (Google characters, or recording time) once.
