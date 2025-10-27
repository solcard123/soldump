"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormField, FormItem, FormControl, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const schema = z.object({
  email: z.string().email('Invalid email'),
  username: z.string().min(3, 'Min 3 chars'),
  password: z.string().min(6, 'Min 6 chars'),
})

type FormValues = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', username: '', password: '' } })

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    const res = await fetch('/api/auth/register', { method: 'POST', body: JSON.stringify(values) })
    if (!res.ok) {
      const data = await res.json()
      setServerError(data.error || 'Error')
      return
    }
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
  <h1 className="text-2xl font-bold text-center">Register</h1>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="username" render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
            <Button type="submit" className="w-full">Create account</Button>
          </form>
        </Form>
  <p className="text-sm text-center">Already have an account? <Link className="text-primary underline" href="/login">Sign in</Link></p>
      </div>
    </div>
  )
}
