import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            /** The user's postal address. */
            id: string
            tier: 'BASIC' | 'PRO' | 'VVIP'
            membershipExpires?: string
            daysUntilExpiry?: number
            isExpired?: boolean

            // Subscription Fields
            subscriptionStatus?: 'free' | 'active' | 'expired'
            subscriptionEndDate?: string | null
            telegramChatId?: string | null
        } & DefaultSession["user"]
    }
}

declare module "next-auth/jwt" {
    /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
    interface JWT {
        id: string
        tier: 'BASIC' | 'PRO' | 'VVIP'
    }
}
