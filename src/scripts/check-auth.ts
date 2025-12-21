import dotenv from "dotenv";

dotenv.config();

console.log(`
To find your Clerk user ID:

1. Open your browser's developer tools (F12)
2. Go to the Network tab
3. Log in to your application
4. Look for any API request to your backend
5. Check the request headers for the authorization token
6. Or check the response from /api/anomalies/stats to see the error details

Alternatively, add this temporarily to your backend at src/api/anomalies.ts line 64:

  console.log('Clerk User ID from auth:', auth.userId);

Then make a request and check your backend logs.

The current user in the database is: user_376z8DaZyeui6oM4vPE4u55lpRi
You need to update the seed script with your actual Clerk user ID.
`);
