import os
from supabase import create_client, Client

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")  # service role key

if not url or not key:
    print("Warning: SUPABASE_URL or SUPABASE_KEY not set — Supabase features disabled.")

supabase: Client = create_client(url, key) if (url and key) else None


def get_user_id_from_token(token: str):
    """
    Verify a Supabase access token and return the user's UUID string.
    Returns None if the token is missing, invalid, or expired.
    Uses supabase.auth.get_user() — no JWT secret needed on our end.
    """
    if not supabase or not token:
        return None
    try:
        res = supabase.auth.get_user(token)
        return str(res.user.id) if res.user else None
    except Exception:
        return None
