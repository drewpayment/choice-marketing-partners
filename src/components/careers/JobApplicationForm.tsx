'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const MAX_RESUME_BYTES = 10 * 1024 * 1024

const ALLOWED_RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

const schema = z.object({
  applicant_name: z.string().min(2, 'Please enter your name').max(160),
  applicant_email: z.string().email('Please enter a valid email').max(160),
  applicant_phone: z
    .string()
    .max(40)
    .optional()
    .or(z.literal('')),
  cover_letter: z.string().max(5000).optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

interface Props {
  jobSlug: string
  jobTitle: string
}

export default function JobApplicationForm({ jobSlug, jobTitle }: Props) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  function handleResumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setResumeError(null)
    const file = e.target.files?.[0] ?? null
    if (!file) {
      setResumeFile(null)
      return
    }
    if (file.size > MAX_RESUME_BYTES) {
      setResumeError('Resume must be 10 MB or smaller.')
      return
    }
    if (file.type && !ALLOWED_RESUME_TYPES.includes(file.type)) {
      setResumeError('Resume must be a PDF, Word doc, or plain text file.')
      return
    }
    setResumeFile(file)
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    if (resumeError) return

    const formData = new FormData()
    formData.set('applicant_name', values.applicant_name)
    formData.set('applicant_email', values.applicant_email)
    if (values.applicant_phone) formData.set('applicant_phone', values.applicant_phone)
    if (values.cover_letter) formData.set('cover_letter', values.cover_letter)
    if (resumeFile) formData.set('resume', resumeFile)

    try {
      const res = await fetch(`/api/careers/${jobSlug}/apply`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        setSubmitError(payload.error ?? 'Something went wrong submitting your application.')
        return
      }

      router.push(`/careers/${jobSlug}/apply/thanks`)
    } catch {
      setSubmitError('Could not reach the server. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" aria-label={`Apply for ${jobTitle}`}>
      <div>
        <Label htmlFor="applicant_name">
          Full name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="applicant_name"
          autoComplete="name"
          placeholder="Jane Doe"
          {...register('applicant_name')}
          aria-invalid={!!errors.applicant_name}
        />
        {errors.applicant_name && (
          <p className="mt-1 text-sm text-destructive">{errors.applicant_name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="applicant_email">
          Email <span className="text-destructive">*</span>
        </Label>
        <Input
          id="applicant_email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...register('applicant_email')}
          aria-invalid={!!errors.applicant_email}
        />
        {errors.applicant_email && (
          <p className="mt-1 text-sm text-destructive">{errors.applicant_email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="applicant_phone">Phone (optional)</Label>
        <Input
          id="applicant_phone"
          type="tel"
          autoComplete="tel"
          placeholder="(555) 555-5555"
          {...register('applicant_phone')}
        />
      </div>

      <div>
        <Label htmlFor="cover_letter">Why are you a fit? (optional)</Label>
        <Textarea
          id="cover_letter"
          rows={5}
          placeholder="Tell us about your background and what excites you about this role."
          {...register('cover_letter')}
        />
      </div>

      <div>
        <Label htmlFor="resume">Resume (optional)</Label>
        <div className="mt-1 flex items-center gap-3">
          <label
            htmlFor="resume"
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <Upload className="size-4" />
            {resumeFile ? 'Change file' : 'Choose file'}
          </label>
          <input
            id="resume"
            type="file"
            accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="sr-only"
            onChange={handleResumeChange}
          />
          {resumeFile && (
            <span className="text-sm text-muted-foreground">{resumeFile.name}</span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, Word, or text. 10 MB max.
        </p>
        {resumeError && <p className="mt-1 text-sm text-destructive">{resumeError}</p>}
      </div>

      {submitError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={isSubmitting} className="bg-amber-600 text-white hover:bg-amber-700">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Submitting…
            </>
          ) : (
            'Submit application'
          )}
        </Button>
      </div>
    </form>
  )
}
