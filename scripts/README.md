# Database Setup

## Fix for "Database error saving new user"

To fix the registration error, you need to set up the `profiles` table in your Supabase database.

### Steps:

1. **Open your Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your project

2. **Navigate to SQL Editor**
   - In the left sidebar, click on "SQL Editor"

3. **Run the setup script**
   - Copy the entire content of `scripts/setup-database.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the script

### What this script does:

1. **Creates the `profiles` table** with the following columns:
   - `id` (UUID, references auth.users)
   - `email` (TEXT, unique)
   - `full_name` (TEXT)
   - `role` (TEXT, either 'athlete' or 'master')
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

2. **Sets up Row Level Security (RLS)** with policies that:
   - Allow users to view/update their own profile
   - Allow master users to view/update/delete any profile

3. **Creates a database trigger** that automatically creates a profile record whenever a new user signs up through Supabase Auth

4. **Creates an update trigger** to automatically update the `updated_at` timestamp

### After running the script:

- New user registrations will automatically create a profile record
- The "Database error saving new user" should be resolved
- Users will be able to log in and their roles will be properly managed

### Creating a Master User:

Since all new users are created as 'athlete' by default, you'll need to promote one user to 'master':

1. First, register a user normally through the app
2. In the Supabase SQL Editor, run:
   ```sql
   SELECT public.create_master_user('your-email@example.com');
   ```
3. This user will now have master privileges and can access the admin panel

### Testing:

1. Try registering a new user through the login page
2. Promote a user to master using the SQL function above
3. Check that the user appears in the admin users page (if you have master access)
4. Verify that login works properly after registration
5. Test that the error "Database error saving new user" is resolved

### Troubleshooting:

If you still get errors, check the Supabase logs in your dashboard for more details. The trigger function includes error handling that will log issues without breaking user registration. 