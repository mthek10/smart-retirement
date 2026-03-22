

## Add Roth Conversion Tax Source Option

Add a setting to control whether taxes on Roth conversions are paid from the brokerage account or from the converted funds themselves.

### How It Works

- **Brokerage (default)**: Full conversion amount moves to Roth. The tax on the conversion increases the year's withdrawal target, which gets funded from brokerage/other accounts as usual. This is the current behavior.
- **From conversion**: The conversion amount is reduced by the estimated tax, so only the after-tax portion lands in the Roth. The tax is effectively "paid" from the Traditional balance. For example, converting $50k at a 22% marginal rate would move ~$39k to Roth.

### Changes

1. **src/hooks/useProjections.ts** — Add `rothConversionTaxSource: "brokerage" | "conversion"` to `TaxSettings` interface. In the conversion block (~line 900), when source is `"conversion"`, estimate the marginal tax on the conversion, reduce `rothBalance += rothConversion` to `rothBalance += rothConversion - conversionTax`, and avoid adding the conversion tax to the withdrawal target.

2. **src/components/TaxSettings.tsx** — Add a radio group or select below the Roth Conversion Strategy dropdown (visible when strategy is not `"none"`): "Pay conversion taxes from: Brokerage Account / Converted Funds". Default to "Brokerage Account".

3. **src/pages/Index.tsx** — Add `rothConversionTaxSource: "brokerage"` to `DEFAULT_TAX_SETTINGS`.

4. **src/lib/exportUtils.ts** — Include `rothConversionTaxSource` in CSV export/import.

