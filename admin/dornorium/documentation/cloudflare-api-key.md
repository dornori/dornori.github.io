How to Create the "Dornorium Installer" API Token
Step 1 — Open the Token Creator
Go to: Create API Token

Scroll to the bottom → click Create Custom Token → Get started

Step 2 — Name the Token
In the Token name field, enter:

Dornorium Installer
Step 3 — Add Account Permissions
For each row below, set the first dropdown to Account, then select the product and access level:

#	Dropdown 1	Dropdown 2 (Product)	Dropdown 3 (Access)
1	Account	Account Settings	Read
2	Account	Account Settings	Edit
3	Account	Workers Scripts	Edit
4	Account	Workers Scripts	Read
5	Account	Workers Secrets	Edit
6	Account	Workers Subdomain	Edit
7	Account	Workers KV Storage	Edit
8	Account	D1	Edit
9	Account	D1	Read
Click + Add more after each row if more rows are needed.

Step 4 — Add Zone Permissions
For each row below, set the first dropdown to Zone, then select the product and access level:

#	Dropdown 1	Dropdown 2 (Product)	Dropdown 3 (Access)
1	Zone	Zone	Read
2	Zone	Zone	Edit
3	Zone	DNS	Edit
4	Zone	Email Routing Addresses	Edit
Note: Some dashboard versions combine Read+Edit into a single "Edit" option. If you see "Edit" already implies Read, you can skip the separate Read rows. When in doubt, add both — it won't cause issues.

Step 5 — Set Account Resources
Under Account Resources:

Select Include → Specific account → choose <your gmail address> Account
Step 6 — Set Zone Resources (All Zones)
Under Zone Resources:

Select Include → All zones from an account → choose Dornori.info@gmail.com's Account
This grants the token access to every zone in your account, including any you add in the future.

Step 7 — (Optional) IP Filtering
If your installer runs from a fixed IP, you can restrict the token to that IP under Client IP Address Filtering. Otherwise, skip this section.

Step 8 — Review and Create
Click Continue to summary
Review the permissions — they should match the full list above
Click Create Token
Copy the token immediately — it will not be shown again
Quick Reference — Full Permission List
Token Name: Dornorium Installer

Account Permissions:
  ✅ Account Settings: Read
  ✅ Account Settings: Edit
  ✅ Workers Scripts: Edit
  ✅ Workers Scripts: Read
  ✅ Workers Secrets: Edit
  ✅ Workers Subdomain: Edit
  ✅ Workers KV Storage: Edit
  ✅ D1: Edit
  ✅ D1: Read

Zone Permissions (All Zones):
  ✅ Zone: Read
  ✅ Zone: Edit
  ✅ DNS: Edit
  ✅ Email Routing Addresses: Edit

Account Resources: Include → Specific account → Dornori.info@gmail.com's Account
Zone Resources:    Include → All zones from an account → Dornori.info@gmail.com's Account
