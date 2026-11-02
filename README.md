# NC healthcare maps — selected provider/site comparison

Open `index.html` with VS Code Live Server (internet required for D3 and US Atlas).

**Visualization 1** retains three independently selectable provider groups.

**Visualization 2** is a single map. County blue shading is the sum of 2023 AHRF primary care physicians, psychiatrists, and dentists per 10,000 county residents (not all clinicians). Dots represent selected mapped HRSA community-site records from the original overlay: health centers and rural health clinics. They are not a complete inventory, and a site may not offer a service represented by the workforce count. The headline and the three labeled counties identify below-median values on *both* per-resident measures; this is a descriptive comparison, not a correlation test.

Data sources: AHRF 2024–2025 release, HRSA Site Dashboard export. All original program records remain preserved in the companion Excel workbook. New fields in `data/counties.csv`: `selected_provider_count`, `selected_provider_rate`. `data/nc_combined_provider_sites.csv` contains the 100-county comparison.
