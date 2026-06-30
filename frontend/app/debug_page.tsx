import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DebugPage() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (!user) {
    return (
      <pre style={{ padding: 24, fontSize: 13 }}>
        NO USER FOUND IN SESSION
        {'\n'}userError: {JSON.stringify(userError, null, 2)}
      </pre>
    )
  }

  const db = await createServiceClient()

  const { data: membership, error: membershipError } = await db
    .from('organization_members')
    .select('organization_id, role, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  const { data: allMemberships } = await db
    .from('organization_members')
    .select('*')
    .eq('user_id', user.id)

  return (
    <pre style={{ padding: 24, fontSize: 13, whiteSpace: 'pre-wrap' }}>
{`SESSION USER:
  id: ${user.id}
  email: ${user.email}

MEMBERSHIP QUERY (.eq('status','active').single()):
  data: ${JSON.stringify(membership, null, 2)}
  error: ${JSON.stringify(membershipError, null, 2)}

ALL MEMBERSHIPS FOR THIS USER ID (no filter):
  ${JSON.stringify(allMemberships, null, 2)}
`}
    </pre>
  )
}
