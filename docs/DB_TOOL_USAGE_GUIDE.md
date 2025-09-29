# Database Management Tool Usage Guide

## Overview

The database management tool (`./db`) is a single, comprehensive Node.js script that handles all database operations for the Patricia & James Wedding App. It replaces multiple shell scripts and provides a clean, maintainable solution for database management.

## Quick Start

```bash
# Show database statistics
./db stats

# Show all users
./db users

# Show help
./db help
```

## Commands Reference

### `./db stats`
Shows database statistics including user count, RSVP count, and attendance numbers.

**Example Output:**
```
📊 Database Statistics
====================
👥 Total Users: 10
📝 Total RSVPs: 0
🎉 Attending: 0
```

### `./db users`
Displays all users in the database with their details including partner relationships.

**Example Output:**
```
👥 Users in Database
===================
┌─────────┬────────────────────────────────────────┬────────────┬────────────┬───────┬────────────────┬──────────────────┬────────────────────┬───────────────────┐
│ (index) │                   id                   │ first_name │ last_name  │ email │ account_status │ plus_one_allowed │ partner_first_name │ partner_last_name │
├─────────┼────────────────────────────────────────┼────────────┼────────────┼───────┼────────────────┼──────────────────┼────────────────────┼───────────────────┤
│    0    │ 'dcda3db5-086b-44e3-8449-00cd117becc4' │   'Jack'   │   'Blue'   │ null  │    'guest'     │       true       │        null        │       null        │
└─────────┴────────────────────────────────────────┴────────────┴────────────┴───────┴────────────────┴──────────────────┴────────────────────┴───────────────────┘
```

### `./db rsvps`
Shows all RSVPs in the database with user details and response information.

**Example Output:**
```
📝 RSVPs in Database
==================
┌─────────┬────────────────────────────────────────┬────────────┬────────────┬──────────────────┬─────────────────────┬─────────────────────┐
│ (index) │                   id                   │ first_name │ last_name  │ response_status  │ dietary_restrictions │     responded_at     │
├─────────┼────────────────────────────────────────┼────────────┼────────────┼──────────────────┼─────────────────────┼─────────────────────┤
│    0    │ 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' │   'John'   │   'Smith'  │    'attending'   │      'Vegetarian'   │ 2024-09-27T15:30:00Z │
└─────────┴────────────────────────────────────────┴────────────┴────────────┴──────────────────┴─────────────────────┴─────────────────────┘
```

### `./db reset --confirm`
**⚠️ DANGER: This will completely reset the database!**

Resets the database to the initial seeded state by:
1. Clearing all existing data (users, RSVPs, sessions)
2. Reading guest data from `server/test-guests.csv`
3. Creating user records with proper attributes
4. Setting up partner relationships automatically

**Usage:**
```bash
./db reset --confirm
```

**Example Output:**
```
🔄 Resetting database...
✅ Database cleared.
🌱 Seeding from CSV...
📄 Found 10 guests in CSV file
  ✅ Added: Mike Jones (ID: 5217e305-5882-4062-b07a-28f9a5e2b429)
  ✅ Added: John Smith (ID: d2236368-ba3a-41d9-b872-5f78ec63faa0)
  ...
🔗 Setting up partner relationships...
  🔗 Linked: John Smith ↔ Jane Smith
  🔗 Linked: Jane Smith ↔ John Smith
✅ Database reset complete!
```

### `./db clean`
Removes test data while preserving seeded users. This is useful for cleaning up after testing without losing the initial guest list.

**What it does:**
- Clears all RSVPs
- Removes test users (those with test emails)
- Preserves seeded users from CSV

**Usage:**
```bash
./db clean
```

**Example Output:**
```
🧹 Cleaning database...
✅ RSVPs cleared
✅ Test users cleared
✅ Database cleaned!
```

### `./db help`
Shows the help information with all available commands.

**Usage:**
```bash
./db help
```

## CSV File Format

The database tool uses `server/test-guests.csv` for seeding. The CSV format is:

```csv
first_name,last_name,plus_one_allowed,partner_first,partner_last,admin_notes
Mike,Jones,false,,,Individual guest no plus-one
John,Smith,false,Jane,Smith,Partner of Jane Smith
Jane,Smith,false,John,Smith,Partner of John Smith
Jack,Blue,true,,,Individual guest plus-one allowed
```

### CSV Columns:
- **first_name**: Guest's first name
- **last_name**: Guest's last name  
- **plus_one_allowed**: `true` or `false` - whether guest can bring a plus-one
- **partner_first**: Partner's first name (empty for individuals)
- **partner_last**: Partner's last name (empty for individuals)
- **admin_notes**: Optional notes about the guest

## Common Workflows

### Development Testing
```bash
# Check current state
./db stats

# Clean test data
./db clean

# Reset to fresh state
./db reset --confirm
```

### Production Deployment
```bash
# Reset to production guest list
./db reset --confirm

# Check deployment
./db stats
./db users
```

### Debugging
```bash
# Check users
./db users

# Check RSVPs
./db rsvps

# Get statistics
./db stats
```

## Technical Details

### File Structure
```
patricia-james-app/
├── db                    # Wrapper script (runs server/db)
├── server/
│   ├── db               # Main database tool
│   ├── test-guests.csv  # Guest data for seeding
│   └── .env            # Environment variables
```

### Dependencies
- **Node.js** - Runtime environment
- **dotenv** - Environment variable loading
- **pg** - PostgreSQL database connection
- **fs** - File system operations (CSV reading)

### Environment Variables
The tool requires these environment variables in `server/.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `DATABASE_ADMIN_URL` - Admin connection string (optional)

## Error Handling

The tool includes comprehensive error handling:
- Database connection errors
- CSV file reading errors
- SQL execution errors
- Missing confirmation flags

All errors are displayed with clear messages and the tool exits gracefully.

## Best Practices

1. **Always use `--confirm` with reset** - Prevents accidental data loss
2. **Check stats before operations** - Verify current state
3. **Use clean for testing** - Preserves seeded data
4. **Backup before reset** - Export data if needed
5. **Test CSV format** - Ensure proper partner relationships

## Troubleshooting

### Common Issues

**"Cannot find module 'dotenv'"**
- Ensure you're running from the project root
- Check that `server/.env` exists

**"Database connection failed"**
- Verify `DATABASE_URL` in `server/.env`
- Ensure PostgreSQL is running

**"CSV file not found"**
- Check that `server/test-guests.csv` exists
- Verify CSV format matches expected structure

**"Partner relationship failed"**
- Check CSV partner names match exactly
- Ensure both partners are in the CSV file

### Getting Help

```bash
# Show all commands
./db help

# Check current state
./db stats

# Verify users
./db users
```

## Examples

### Complete Reset Workflow
```bash
# 1. Check current state
./db stats

# 2. Reset to seeded state
./db reset --confirm

# 3. Verify reset
./db stats
./db users
```

### Testing Workflow
```bash
# 1. Start with clean state
./db reset --confirm

# 2. Run tests (creates test data)
# ... your tests here ...

# 3. Clean test data
./db clean

# 4. Verify clean state
./db stats
```

This database tool provides a clean, maintainable solution for all database management needs in the Patricia & James Wedding App.
