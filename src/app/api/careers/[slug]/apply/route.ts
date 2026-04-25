import { NextResponse } from 'next/server'
import { z } from 'zod'
import { JobPostingRepository } from '@/lib/repositories/JobPostingRepository'
import { JobApplicationRepository } from '@/lib/repositories/JobApplicationRepository'
import { uploadToBlob } from '@/lib/storage/vercel-blob'
import { sendApplicationNotification } from '@/lib/services/email'
import { logger } from '@/lib/utils/logger'

const MAX_RESUME_BYTES = 10 * 1024 * 1024
const ALLOWED_RESUME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])

const fieldsSchema = z.object({
  applicant_name: z.string().trim().min(2).max(160),
  applicant_email: z.string().trim().email().max(160),
  applicant_phone: z.string().trim().max(40).optional(),
  cover_letter: z.string().trim().max(5000).optional(),
})

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params

  try {
    const jobRepo = new JobPostingRepository()
    const job = await jobRepo.getActiveBySlug(slug)
    if (!job) {
      return NextResponse.json({ error: 'Role not found or no longer open.' }, { status: 404 })
    }
    if (job.apply_url) {
      return NextResponse.json(
        { error: 'This role uses an external application — please apply via the link on the role page.' },
        { status: 400 },
      )
    }

    const formData = await request.formData()

    const parsed = fieldsSchema.safeParse({
      applicant_name: formData.get('applicant_name')?.toString() ?? '',
      applicant_email: formData.get('applicant_email')?.toString() ?? '',
      applicant_phone: formData.get('applicant_phone')?.toString() || undefined,
      cover_letter: formData.get('cover_letter')?.toString() || undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please double-check your name, email, and other fields.' },
        { status: 400 },
      )
    }

    let resumeUrl: string | null = null
    let resumeFilename: string | null = null

    const resume = formData.get('resume')
    if (resume instanceof File && resume.size > 0) {
      if (resume.size > MAX_RESUME_BYTES) {
        return NextResponse.json({ error: 'Resume must be 10 MB or smaller.' }, { status: 400 })
      }
      if (resume.type && !ALLOWED_RESUME_TYPES.has(resume.type)) {
        return NextResponse.json(
          { error: 'Resume must be a PDF, Word doc, or plain text file.' },
          { status: 400 },
        )
      }
      try {
        const safeName = resume.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200)
        const pathnameSafe = `careers/${slug}/${Date.now()}_${safeName}`
        const upload = await uploadToBlob(
          resume,
          pathnameSafe,
          resume.type || 'application/octet-stream',
        )
        resumeUrl = upload.downloadUrl
        resumeFilename = resume.name.slice(0, 200)
      } catch (uploadError) {
        logger.error('Resume upload failed', uploadError)
        return NextResponse.json(
          { error: 'Could not upload your resume. Please try again or apply without it.' },
          { status: 500 },
        )
      }
    }

    const applicationRepo = new JobApplicationRepository()
    const { id } = await applicationRepo.submit({
      job_posting_id: job.id,
      applicant_name: parsed.data.applicant_name,
      applicant_email: parsed.data.applicant_email,
      applicant_phone: parsed.data.applicant_phone ?? null,
      cover_letter: parsed.data.cover_letter ?? null,
      resume_url: resumeUrl,
      resume_filename: resumeFilename,
    })

    // Best-effort notification — don't fail the submission if Resend is misconfigured.
    void sendApplicationNotification({
      jobTitle: job.title,
      jobSlug: job.slug,
      applicantName: parsed.data.applicant_name,
      applicantEmail: parsed.data.applicant_email,
      applicantPhone: parsed.data.applicant_phone ?? null,
      coverLetter: parsed.data.cover_letter ?? null,
      resumeUrl,
      resumeFilename,
    }).catch((err) => logger.error('Application notification failed', err))

    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    logger.error('Application submission failed', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}
