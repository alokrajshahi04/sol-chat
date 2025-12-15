import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function OAuthCallback({ success }) {
    const navigate = useNavigate()
    const { refresh } = useAuth()

    useEffect(() => {
        if (success) {
            refresh().then(() => navigate('/chat', { replace: true }))
        } else {
            navigate('/login?error=oauth', { replace: true })
        }
    }, [success, refresh, navigate])

    return (
        <div className="h-screen w-full flex items-center justify-center bg-background">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    )
}
