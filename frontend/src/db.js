import { supabase } from './supabase';

// Save a completed session to Supabase
export async function saveSession(userId, data) {
  const { data: row, error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      candidate_name: data.candidate?.name || 'Unknown',
      role_title: data.jd?.role_title || 'Unknown',
      jd_text: data.jd_text || '',
      resume_text: data.resume_text || '',
      gaps: data.gaps || [],
      assessments: data.assessments || {},
      learning_plan: data.learning_plan || null,
      time_to_ready_weeks: data.learning_plan?.time_to_ready_weeks || null,
    })
    .select()
    .single();

  if (error) { console.error('Save session error:', error); return null; }
  return row;
}

// Update an existing session with assessment + plan data
export async function updateSession(sessionDbId, updates) {
  const { error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', sessionDbId);
  if (error) console.error('Update session error:', error);
}

// Fetch all sessions for a user, newest first
export async function getUserSessions(userId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('Fetch sessions error:', error); return []; }
  return data || [];
}

// Delete a session
export async function deleteSession(sessionId) {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId);
  if (error) console.error('Delete session error:', error);
}
