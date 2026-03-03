# Sample Bank Statements

Place your PDF bank statements here for testing the Upload Statement feature (v1.5).

## Folder Structure

```
samples/
  axis/    ← Axis Bank PDF statements (ACTIVE — parser implemented)
  icici/   ← ICICI Bank PDF statements (placeholder — parser not yet implemented)
  hdfc/    ← HDFC Bank PDF statements (placeholder — parser not yet implemented)
```

## Axis Bank Statement Format

The Axis parser expects a PDF with the following column layout:

| Date | Description | Ref No/Cheque No | Branch Code | Withdrawal Amt | Deposit Amt | Balance |

- **Withdrawal Amt** → mapped as `expense`
- **Deposit Amt** → mapped as `income`
- **Date format:** `DD-MM-YYYY`
- **Amount format:** comma-separated (e.g. `1,23,456.78`)

## How to Use

1. Export your bank statement as PDF from your bank's net banking portal
2. Drop it into the appropriate subfolder
3. Use "Upload Statement" in the app → select the bank → upload the file

> ⚠️ These files are for local testing only. Never commit real bank statements to git.
> Add `samples/**/*.pdf` to your `.gitignore`.
