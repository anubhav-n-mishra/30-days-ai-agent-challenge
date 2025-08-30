import os
from dotenv import load_dotenv

# This line is crucial - it loads the .env file
load_dotenv()

# Only load Supabase configuration from environment
# Other API keys will be provided by users through the interface
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")