Expo mobile project (Catalogo de Filmes) - login modal (no initial login screen).
This app uses Supabase for authentication (email/password) and for comments. 
Behavior:
- App opens to movie list. If not authenticated, a login modal appears.
- After login, modal closes and user can comment as authenticated user.
- Logout button logs out the user and reopens the login modal.
Supabase: project URL and anon key are already set in src/utils/supabase.js
Ensure the Supabase 'comments' table exists with columns: id (bigint), movie_id (bigint), user_id (text or uuid), content (text), created_at (timestamptz).
To run:
1. unzip
2. npm install
3. npx expo start
