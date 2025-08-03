# Date Format Configuration

## Excel Upload Date Parsing

The attendance dashboard has been configured to correctly parse dates from Excel files uploaded by users.

### Supported Date Formats (in priority order):

1. **DD/MM/YYYY** - European format (e.g., 05/07/2025 = July 5th, 2025) ✅ **Primary**
2. **YYYY-MM-DD** - ISO format (e.g., 2025-07-05)
3. **MM/DD/YYYY** - US format (e.g., 07/05/2025 = July 5th, 2025)
4. **DD-MM-YYYY** - European with dashes
5. **YYYY/MM/DD** - Alternative ISO
6. **MM-DD-YYYY** - US with dashes

### Important Notes:

- **Excel files should use DD/MM/YYYY format** to avoid confusion
- The system now prioritizes DD/MM/YYYY when parsing ambiguous dates
- For example: "05/07/2025" will be interpreted as **July 5th, 2025** (not May 7th)
- This change ensures consistency with European date conventions

### Backend Implementation:

The date parsing logic in `/backend/routes/admin.js` has been updated to:
1. Try DD/MM/YYYY format first
2. Fall back to other formats if the first parsing fails
3. Cache parsed dates for performance

### Frontend Display:

All dates in the frontend are displayed using the format: **dd/MMM/yyyy** (e.g., 05/Jul/2025)

This ensures there's no ambiguity in date display regardless of the input format.

---

**Updated:** July 5, 2025  
**Affects:** Excel/CSV file uploads, date parsing, attendance records display
