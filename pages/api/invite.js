// pages/api/invite.js
import { createAdminClient } from '@/lib/supabase/admin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email ist erforderlich.' });
  }

  try {
    // 1) Hier das Redirect-Ziel fest definieren und loggen
    const redirectToUrl = 'http://localhost:3000/passwort-festlegen';
    console.log('[Invite API] redirectTo =', redirectToUrl);

    // 2) Admin-Client initialisieren und Invite versenden
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectToUrl
    });

    // 3) Ergebnis loggen
    console.log('[Invite API] Supabase response:', { data, error });

    if (error) {
      console.error('[Invite API] Invite-Error:', error);
      return res.status(500).json({ error: error.message });
    }

    // 4) Erfolg zurückmelden
    return res.status(200).json({ data });
  } catch (err) {
    console.error('[Invite API] Server-Error:', err);
    return res.status(500).json({ error: 'Interner Serverfehler.' });
  }
}
