import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? undefined : "http://localhost:3000"),
    plugins: [
        adminClient()
    ]
})
export const { signUp, signIn, signOut, useSession } = authClient;
