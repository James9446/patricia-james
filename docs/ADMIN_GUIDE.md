# Wedding Website Admin Guide

## Guest List Management

### Overview
This guide explains how to populate and manage the guest list for the wedding website. The system uses a combined table approach where all guest and user data is stored in a single `users` table.

### Guest Types

#### 1. Individual Guests
- **Single guests** with no partner
- May or may not be allowed a plus-one
- Example: Single friends, colleagues

#### 2. Couples (Partners)
- **Both partners** are equal users in the system
- **Either partner** can RSVP for both
- Both can create accounts and manage their own information
- Example: Married couples, long-term partners

#### 3. Plus-Ones
- Additional guests that primary guests can bring
- **Become real users** in the system when added
- Can create their own accounts after being added
- Treated as regular users with full capabilities

### Database Schema for Guest Relationships

```sql
-- Individual guest (no partner)
INSERT INTO users (first_name, last_name, plus_one_allowed, account_status) 
VALUES ('Maria', 'Garcia', true, 'guest');

-- Couple (both partners)
INSERT INTO users (first_name, last_name, plus_one_allowed, account_status) 
VALUES ('John', 'Doe', false, 'guest');

INSERT INTO users (first_name, last_name, plus_one_allowed, account_status) 
VALUES ('Jane', 'Doe', false, 'guest');

-- Link them as partners
UPDATE users 
SET partner_id = (SELECT id FROM users WHERE first_name = 'Jane' AND last_name = 'Doe')
WHERE first_name = 'John' AND last_name = 'Doe';

UPDATE users 
SET partner_id = (SELECT id FROM users WHERE first_name = 'John' AND last_name = 'Doe')
WHERE first_name = 'Jane' AND last_name = 'Doe';
```

### Admin Workflow

#### Step 1: Prepare Your Guest List
Create a CSV file with the following columns:
- `first_name`
- `last_name` 
- `plus_one_allowed` (true/false)
- `partner_first` (if applicable)
- `partner_last` (if applicable)
- `admin_notes` (internal notes)

#### Step 2: CSV Format Example

**Individual Guests:**
```csv
first_name,last_name,plus_one_allowed,partner_first,partner_last,admin_notes
John,Smith,false,,,Individual guest no plus-one
Sarah,Johnson,true,,,Individual guest plus-one allowed
```

**Couples:**
```csv
first_name,last_name,plus_one_allowed,partner_first,partner_last,admin_notes
Maria,Garcia,false,John,Doe,Partner of John Doe
John,Doe,false,Maria,Garcia,Partner of Maria Garcia
```

#### Step 3: Database Population

Use the built-in database tool to populate the database:

```bash
# Reset database to seeded state
./db reset --confirm

# Check current users
./db users

# View database statistics
./db stats
```

The database tool automatically:
- Reads from `server/test-guests.csv`
- Creates user records with proper attributes
- Sets up partner relationships
- Handles all the complex linking logic

### RSVP Flow for Different Guest Types

#### Individual Guest RSVP
1. Guest logs in with their email
2. Sees their invitation details
3. Selects attending/not attending
4. If plus-one allowed: provides plus-one name/email
5. Submits RSVP

#### Couple RSVP (Primary Guest)
1. Primary guest logs in
2. Sees both their info and partner's info
3. Selects attending/not attending for both
4. If plus-one allowed: provides plus-one details
5. Submits RSVP for both

#### Couple RSVP (Partner)
1. Partner logs in (if they create account)
2. Sees their info and primary guest's info
3. Can update RSVP for both
4. Same plus-one options as primary guest

### Key Features

#### 1. Flexible Partner Relationships
- Partners can both create accounts
- Either partner can RSVP for both
- System prevents duplicate RSVPs

#### 2. Plus-One Management
- Only allowed guests can bring plus-ones
- Plus-one details collected during RSVP
- Plus-ones added to database automatically

#### 3. Admin Controls
- View all guests and their relationships
- Track RSVP status
- Manage plus-one approvals
- Internal notes for each guest

### Database Views for Admin

#### Guest Pairs View
```sql
SELECT * FROM guest_pairs;
-- Shows all primary guests with their partners
```

#### RSVP Summary View
```sql
SELECT * FROM rsvp_summary;
-- Shows RSVP status for all primary guests
```

### Database Management Commands

#### View All Users
```bash
./db users
```

#### View All RSVPs
```bash
./db rsvps
```

#### View Database Statistics
```bash
./db stats
```

#### Reset Database to Seeded State
```bash
./db reset --confirm
```

#### Clean Test Data
```bash
./db clean
```

#### Get Help
```bash
./db help
```

### Best Practices

1. **Use CSV format for guest import** - Easier to manage and update
2. **Set partner relationships correctly** - Both partners must reference each other
3. **Set plus_one_allowed carefully** - Controls who can bring additional guests
4. **Use admin_notes** - Track special requirements or notes
5. **Test with sample data** - Verify relationships work correctly
6. **Use database tool for management** - Avoid manual SQL operations

### Common Scenarios

#### Scenario 1: Married Couple
- Both get invitations
- Either can RSVP for both
- No plus-one needed

#### Scenario 2: Single Friend with Plus-One
- Friend gets invitation
- Can bring a date
- Must provide date's name/email

#### Scenario 3: Family with Adult Children
- Parents are primary guests
- Adult children are partners
- Each can RSVP independently

#### Scenario 4: Friend Group
- Each person is individual guest
- Some allowed plus-ones, some not
- Each RSVPs separately

### Troubleshooting

#### Issue: Partner not showing up in RSVP
- Check partner_id is set correctly
- Verify both guests are in database
- Check partner relationships

#### Issue: Plus-one not allowed
- Verify plus_one_allowed is true
- Check guest permissions
- Review RSVP form logic

#### Issue: Duplicate RSVPs
- System prevents duplicates per guest
- Partners can both RSVP (updates same record)
- Check for multiple guest records

### Security Considerations

1. **Admin access only** - Guest management requires admin privileges
2. **Data validation** - All inputs validated before database insertion
3. **Audit trail** - All changes tracked with timestamps
4. **Backup strategy** - Regular database backups before major changes
