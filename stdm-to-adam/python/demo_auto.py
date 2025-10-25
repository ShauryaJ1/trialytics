"""
Automated Demo: SDTM-to-ADaM Python Wrapper

Non-interactive demo that showcases all features automatically.
Perfect for quick validation and CI/CD pipelines.

Usage:
    python demo_auto.py
"""

import pandas as pd
from pipeline import run_pipeline, SDTMToADaMPipeline
from utils import validate_sdtm_dataset, validate_adam_dataset, create_pipeline_summary

print("="*70)
print("  SDTM-to-ADaM Python Wrapper - Automated Demo")
print("="*70)

# Step 1: Quick One-Line Execution
print("\n[1] Quick One-Line Execution")
print("-" * 70)
result = run_pipeline(use_test_data=True)

print(f"✓ Status: {result.status}")
print(f"✓ Execution time: {result.execution_time:.2f} seconds")
print(f"✓ Datasets generated: {len(result.datasets)}")

for name, df in result.datasets.items():
    print(f"  - {name.upper()}: {len(df):,} rows × {len(df.columns)} columns")

# Step 2: Validate ADaM Datasets
print("\n[2] ADaM Dataset Validation")
print("-" * 70)

for name, df in result.datasets.items():
    validation = validate_adam_dataset(df, name)
    status = "✓" if validation['valid'] else "✗"
    missing = f" (missing: {validation['missing_variables']})" if not validation['valid'] else ""
    print(f"{status} {validation['dataset']}: {validation['row_count']:,} rows{missing}")

# Step 3: ADSL Analysis
print("\n[3] ADSL Subject-Level Analysis")
print("-" * 70)

adsl = result.datasets['adsl']

if 'TRT01P' in adsl.columns:
    print("\nTreatment Distribution:")
    trt_counts = adsl['TRT01P'].value_counts()
    for trt, count in trt_counts.items():
        pct = count / len(adsl) * 100
        print(f"  {trt}: {count} ({pct:.1f}%)")

if 'AGE' in adsl.columns:
    print(f"\nAge Statistics:")
    print(f"  Mean: {adsl['AGE'].mean():.1f} years")
    print(f"  Median: {adsl['AGE'].median():.1f} years")
    print(f"  Range: {adsl['AGE'].min():.0f} - {adsl['AGE'].max():.0f} years")

if 'SEX' in adsl.columns:
    print(f"\nSex Distribution:")
    sex_counts = adsl['SEX'].value_counts()
    for sex, count in sex_counts.items():
        pct = count / len(adsl) * 100
        print(f"  {sex}: {count} ({pct:.1f}%)")

# Step 4: ADAE Adverse Events Analysis
if 'adae' in result.datasets:
    print("\n[4] ADAE Adverse Events Analysis")
    print("-" * 70)

    adae = result.datasets['adae']
    print(f"\nTotal adverse events: {len(adae):,}")

    if 'TRTEMFL' in adae.columns:
        te_aes = adae[adae['TRTEMFL'] == 'Y']
        print(f"Treatment-emergent: {len(te_aes):,} ({len(te_aes)/len(adae)*100:.1f}%)")

    if 'AESEV' in adae.columns:
        print("\nSeverity Distribution:")
        sev_counts = adae['AESEV'].value_counts()
        for sev, count in sev_counts.items():
            pct = count / len(adae) * 100
            print(f"  {sev}: {count} ({pct:.1f}%)")

    if 'AETERM' in adae.columns:
        print("\nTop 5 Adverse Events:")
        top_aes = adae['AETERM'].value_counts().head(5)
        for i, (ae, count) in enumerate(top_aes.items(), 1):
            print(f"  {i}. {ae}: {count} events")

# Step 5: Treatment Comparison
print("\n[5] Treatment Arm Comparison")
print("-" * 70)

if 'TRT01P' in adsl.columns and 'AGE' in adsl.columns:
    comparison = adsl.groupby('TRT01P')['AGE'].agg(['count', 'mean', 'std']).round(2)
    print("\nAge by Treatment Arm:")
    print(comparison)

# Step 6: Pandas Advanced Operations
print("\n[6] Advanced Pandas Analysis")
print("-" * 70)

if 'AGE' in adsl.columns:
    # Create age groups
    adsl_copy = adsl.copy()
    adsl_copy['AGE_GROUP'] = pd.cut(
        adsl_copy['AGE'],
        bins=[0, 40, 60, 100],
        labels=['18-40', '41-60', '61+']
    )

    print("\nAge Group Distribution:")
    age_groups = adsl_copy['AGE_GROUP'].value_counts().sort_index()
    for group, count in age_groups.items():
        pct = count / len(adsl_copy) * 100
        print(f"  {group}: {count} ({pct:.1f}%)")

    # Cross-tabulation
    if 'TRT01P' in adsl_copy.columns and 'SEX' in adsl_copy.columns:
        print("\nTreatment by Sex:")
        crosstab = pd.crosstab(adsl_copy['TRT01P'], adsl_copy['SEX'])
        print(crosstab)

# Step 7: Pipeline Summary
print("\n[7] Pipeline Summary")
print("-" * 70)

summary = create_pipeline_summary(result)

print(f"\nJob ID: {summary['job_id']}")
print(f"Status: {summary['status']}")
print(f"Execution Time: {summary['execution_time']:.2f} seconds")
print(f"Datasets Generated: {summary['datasets_generated']}")

print("\nDataset Details:")
for dataset, details in summary['dataset_details'].items():
    print(f"  {dataset.upper()}:")
    print(f"    Rows: {details['rows']:,}")
    print(f"    Columns: {details['columns']}")
    print(f"    Memory: {details['memory_usage_mb']:.2f} MB")

# Step 8: Data Quality Checks
print("\n[8] Data Quality Checks")
print("-" * 70)

print("\nChecking for missing key variables:")

key_vars = {
    'adsl': ['USUBJID', 'TRT01P', 'AGE', 'SEX'],
    'adae': ['USUBJID', 'AETERM', 'AESTDTC'],
    'advs': ['USUBJID', 'VSTESTCD', 'VSORRES'],
    'adlb': ['USUBJID', 'LBTESTCD', 'LBORRES']
}

for dataset_name, vars_to_check in key_vars.items():
    if dataset_name in result.datasets:
        df = result.datasets[dataset_name]
        missing_info = []

        for var in vars_to_check:
            if var in df.columns:
                missing_count = df[var].isna().sum()
                missing_pct = (missing_count / len(df)) * 100
                if missing_count > 0:
                    missing_info.append(f"{var}: {missing_count} ({missing_pct:.1f}%)")

        if missing_info:
            print(f"\n{dataset_name.upper()}:")
            for info in missing_info:
                print(f"  {info}")
        else:
            print(f"✓ {dataset_name.upper()}: No missing values in key variables")

# Conclusion
print("\n" + "="*70)
print("  Demo Complete!")
print("="*70)

print(f"""
Summary:
  ✓ Generated {len(result.datasets)} ADaM datasets successfully
  ✓ Processed {len(adsl)} subjects
  ✓ Execution time: {result.execution_time:.2f} seconds
  ✓ All datasets validated against ADaM standards

Next Steps:
  1. Review outputs in output/ directory
  2. Run comprehensive tests: python test_pipeline.py
  3. Try interactive demo: python demo.py
  4. See example_usage.py for more examples
  5. Check README.md for full documentation

""")

print("="*70)
