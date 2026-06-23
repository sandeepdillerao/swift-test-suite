import { useState } from 'react'
import { FlaskConical, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { httpClient } from '@/services/http-client'
import { useAuthStore } from '@/stores/authStore'
import type { User } from '@/types'

interface Props {
  onComplete: () => void
}

interface InitResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export const FirstRunSetup = ({ onComplete }: Props): JSX.Element => {
  const [orgName, setOrgName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await httpClient.post<InitResponse>('/auth/init', {
        organizationName: orgName,
        firstName,
        lastName,
        email,
        password,
      })
      useAuthStore.getState().login(res.data.user, res.data.accessToken, res.data.refreshToken)
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
              <FlaskConical className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Create your admin account</h1>
          <p className="text-sm text-muted-foreground mt-1">
            No users found in the database. Set up the first admin to get started.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-1">
              <Label className="text-xs">Organization name</Label>
              <Input
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="Acme Corp"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">First name</Label>
                <Input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Last name</Label>
                <Input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 chars, upper, lower, number, symbol"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Requires uppercase, lowercase, number, and special character (@$!%*?&)
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</>
                : <>Create account & open TestFlow <ArrowRight className="h-4 w-4" /></>
              }
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
