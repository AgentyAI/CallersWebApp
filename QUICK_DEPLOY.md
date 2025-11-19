# Quick Deploy - Run These Commands

## Step 1: Link Project (if not already linked)
```bash
cd "/Users/alex/Desktop/Code/Cold callers app"
vercel link
```
When prompted:
- **Set up and develop?** → Yes
- **Which scope?** → Select your account
- **Link to existing project?** → No
- **Project name?** → `cold-callers-app`
- **Directory?** → `./`

## Step 2: Add Environment Variables
Run the auto-generated script:
```bash
bash add-env-auto.sh
```

This will add all 9 environment variables from your `.env` file to Vercel.

**Note:** The script will prompt you to select environments. For each variable, you'll need to:
- Press Enter to select "Production" (or type the number)
- Press Enter to select "Preview" 
- Press Enter to select "Development"

## Step 3: Deploy
```bash
vercel --prod
```

## Done! 🎉

Your app will be live at the URL Vercel provides.

---

## Alternative: Manual Commands

If the script doesn't work, you can run these commands manually (copy from `add-vercel-env-commands.txt`):

```bash
# Each variable needs to be added 3 times (production, preview, development)
echo "YOUR_VALUE" | vercel env add VARIABLE_NAME production
echo "YOUR_VALUE" | vercel env add VARIABLE_NAME preview
echo "YOUR_VALUE" | vercel env add VARIABLE_NAME development
```

