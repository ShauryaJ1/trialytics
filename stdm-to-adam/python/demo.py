"""
Interactive Demo: SDTM-to-ADaM Python Wrapper

This demo showcases the key features of the Python wrapper for the R-based
SDTM → ADaM transformation pipeline.

Features demonstrated:
1. Pipeline initialization and setup
2. Loading SDTM test data from pharmaversesdtm
3. Running the full transformation pipeline
4. Exploring ADaM datasets with Pandas
5. Creating clinical trial summaries
6. Exporting results

Usage:
    python demo.py
"""

import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
import time

from pipeline import SDTMToADaMPipeline, run_pipeline
from utils import (
    validate_sdtm_dataset, validate_adam_dataset,
    create_pipeline_summary, get_r_version
)


# =============================================================================
# DEMO UTILITIES
# =============================================================================

def print_header(title: str, char: str = "="):
    """Print formatted section header"""
    print(f"\n{char * 70}")
    print(f"  {title}")
    print(f"{char * 70}\n")


def print_subheader(title: str):
    """Print formatted subsection header"""
    print(f"\n{'─' * 70}")
    print(f"  {title}")
    print(f"{'─' * 70}")


def print_dataframe_preview(df: pd.DataFrame, name: str, n: int = 5):
    """Print formatted DataFrame preview"""
    print(f"\n{name} Preview (first {n} rows):")
    print(f"Shape: {len(df)} rows × {len(df.columns)} columns\n")

    # Select interesting columns if too many
    if len(df.columns) > 8:
        display_cols = list(df.columns[:8])
        print(df[display_cols].head(n))
        print(f"\n... and {len(df.columns) - 8} more columns")
    else:
        print(df.head(n))


def pause_for_effect(seconds: float = 1.0):
    """Add dramatic pause for demo effect"""
    time.sleep(seconds)


# =============================================================================
# DEMO SECTIONS
# =============================================================================

def demo_intro():
    """Demo Introduction"""
    print_header("SDTM-to-ADaM Pipeline - Interactive Demo", "=")

    print("""
Welcome to the SDTM-to-ADaM Python Wrapper Demo!

This demo will walk you through:
  1. Setting up the pipeline
  2. Loading SDTM clinical trial data
  3. Running the transformation to create ADaM datasets
  4. Analyzing the results with Pandas
  5. Creating summary reports

The pipeline uses:
  • Python (Pandas) for data manipulation
  • R (admiral/pharmaverse) for CDISC-compliant transformations
  • rpy2 for seamless Python-R integration

Press Enter to continue...
""")
    input()


def demo_environment_check():
    """Demo: Check R environment"""
    print_header("Step 1: Environment Check")

    print("Checking R environment...")
    pause_for_effect(0.5)

    r_version = get_r_version()
    print(f"✓ R Version: {r_version}")

    print("\nChecking required R packages:")
    packages = ['admiral', 'dplyr', 'pharmaversesdtm', 'lubridate']

    from utils import check_r_package
    for pkg in packages:
        is_installed = check_r_package(pkg)
        status = "✓" if is_installed else "✗"
        print(f"  {status} {pkg}")
        pause_for_effect(0.2)

    print("\n✓ Environment ready!")
    pause_for_effect(1)


def demo_pipeline_init():
    """Demo: Initialize pipeline"""
    print_header("Step 2: Initialize Pipeline")

    print("Creating SDTMToADaMPipeline instance...")
    pause_for_effect(0.5)

    pipeline = SDTMToADaMPipeline()

    print(f"\n✓ Pipeline initialized!")
    print(f"\nConfiguration:")
    print(f"  Base Directory: {pipeline.base_dir}")
    print(f"  R Pipeline: {pipeline.r_pipeline_dir}")
    print(f"  Output: {pipeline.output_dir}")

    pause_for_effect(1)
    return pipeline


def demo_load_sdtm(pipeline: SDTMToADaMPipeline):
    """Demo: Load SDTM data"""
    print_header("Step 3: Load SDTM Test Data")

    print("Loading SDTM datasets from pharmaversesdtm package...")
    print("(DM, EX, AE, VS, LB domains)")
    pause_for_effect(1)

    sdtm_data = pipeline.load_sdtm_test_data()

    print(f"\n✓ Loaded {len(sdtm_data)} SDTM domains:")

    for domain, df in sdtm_data.items():
        validation = validate_sdtm_dataset(df, domain)
        status = "✓" if validation['valid'] else "✗"
        print(f"  {status} {domain.upper()}: {len(df):,} records, "
              f"{len(df.columns)} variables")
        pause_for_effect(0.2)

    # Show sample of DM (Demographics)
    print_subheader("Demographics (DM) Sample")
    dm = sdtm_data['dm']
    key_cols = ['USUBJID', 'AGE', 'SEX', 'RACE', 'ARM']
    available_cols = [col for col in key_cols if col in dm.columns]

    if available_cols:
        print(dm[available_cols].head(3))

    pause_for_effect(1.5)
    return sdtm_data


def demo_run_pipeline(pipeline: SDTMToADaMPipeline, sdtm_data: dict):
    """Demo: Run the transformation pipeline"""
    print_header("Step 4: Run SDTM → ADaM Transformation")

    print("Executing admiral-based transformation pipeline...")
    print("\nThis will:")
    print("  • Derive treatment dates from EX (Exposure)")
    print("  • Create ADSL (Subject-Level Analysis Dataset)")
    print("  • Create ADAE (Adverse Events Analysis Dataset)")
    print("  • Create ADVS (Vital Signs Analysis Dataset)")
    print("  • Create ADLB (Laboratory Analysis Dataset)")

    pause_for_effect(1)

    print("\n⏳ Running pipeline (this may take a few seconds)...")
    start_time = time.time()

    result = pipeline.run(sdtm_data=sdtm_data)

    execution_time = time.time() - start_time

    if result.status == 'success':
        print(f"\n✓ Pipeline completed successfully!")
        print(f"⏱  Execution time: {execution_time:.2f} seconds")

        print(f"\n📊 Generated {len(result.datasets)} ADaM datasets:")
        for name, df in result.datasets.items():
            print(f"  • {name.upper()}: {len(df):,} rows × {len(df.columns)} columns")
            pause_for_effect(0.2)
    else:
        print(f"\n✗ Pipeline failed: {result.error_message}")

    pause_for_effect(1.5)
    return result


def demo_explore_adsl(result):
    """Demo: Explore ADSL dataset"""
    print_header("Step 5: Explore ADSL (Subject-Level Dataset)")

    adsl = result.datasets['adsl']

    # Validate
    validation = validate_adam_dataset(adsl, 'ADSL')
    if validation['valid']:
        print("✓ ADSL validation passed")
    else:
        print(f"⚠ Missing variables: {validation['missing_variables']}")

    print(f"\nDataset size: {len(adsl)} subjects")

    # Show structure
    print_subheader("ADSL Structure")
    important_cols = ['USUBJID', 'AGE', 'SEX', 'TRT01P', 'TRT01A']
    available_cols = [col for col in important_cols if col in adsl.columns]

    if available_cols:
        print_dataframe_preview(adsl[available_cols], "ADSL", n=5)

    pause_for_effect(1)

    # Demographics summary
    print_subheader("Demographics Summary")

    if 'SEX' in adsl.columns:
        print("\n📊 Sex Distribution:")
        sex_dist = adsl['SEX'].value_counts()
        for sex, count in sex_dist.items():
            pct = count / len(adsl) * 100
            print(f"  {sex}: {count} ({pct:.1f}%)")

    if 'AGE' in adsl.columns:
        print("\n📊 Age Statistics:")
        print(f"  Mean: {adsl['AGE'].mean():.1f} years")
        print(f"  Median: {adsl['AGE'].median():.1f} years")
        print(f"  Range: {adsl['AGE'].min():.0f} - {adsl['AGE'].max():.0f} years")
        print(f"  Std Dev: {adsl['AGE'].std():.1f} years")

    if 'TRT01P' in adsl.columns:
        print("\n📊 Treatment Groups:")
        trt_dist = adsl['TRT01P'].value_counts()
        for trt, count in trt_dist.items():
            print(f"  {trt}: {count} subjects")

    pause_for_effect(2)


def demo_explore_adae(result):
    """Demo: Explore ADAE dataset"""
    if 'adae' not in result.datasets:
        print("\n⚠ ADAE dataset not generated")
        return

    print_header("Step 6: Explore ADAE (Adverse Events)")

    adae = result.datasets['adae']

    print(f"Total adverse events: {len(adae):,}")

    # Treatment-emergent AEs
    if 'TRTEMFL' in adae.columns:
        te_aes = adae[adae['TRTEMFL'] == 'Y']
        print(f"Treatment-emergent AEs: {len(te_aes):,} ({len(te_aes)/len(adae)*100:.1f}%)")

    # Severity distribution
    if 'AESEV' in adae.columns:
        print_subheader("Severity Distribution")
        sev_dist = adae['AESEV'].value_counts()
        for sev, count in sev_dist.items():
            pct = count / len(adae) * 100
            bar = "█" * int(pct / 2)
            print(f"  {sev:15s}: {count:5d} ({pct:5.1f}%) {bar}")

    # Most common AEs
    if 'AETERM' in adae.columns:
        print_subheader("Top 10 Most Common Adverse Events")
        top_aes = adae['AETERM'].value_counts().head(10)

        for i, (ae, count) in enumerate(top_aes.items(), 1):
            subjects = adae[adae['AETERM'] == ae]['USUBJID'].nunique()
            print(f"  {i:2d}. {ae:40s}: {count:4d} events ({subjects} subjects)")

    pause_for_effect(2)


def demo_treatment_comparison(result):
    """Demo: Treatment arm comparison"""
    print_header("Step 7: Treatment Arm Comparison")

    adsl = result.datasets['adsl']

    if 'TRT01P' not in adsl.columns or 'AGE' not in adsl.columns:
        print("⚠ Required variables not available")
        return

    print("Comparing baseline characteristics across treatment groups:\n")

    treatment_summary = adsl.groupby('TRT01P').agg({
        'AGE': ['count', 'mean', 'std'],
        'SEX': lambda x: (x == 'F').sum() if 'SEX' in adsl.columns else 0
    }).round(2)

    if 'AGE' in treatment_summary.columns:
        print("Age Statistics by Treatment:")
        print(treatment_summary['AGE'])

    if 'SEX' in treatment_summary.columns:
        print("\nFemale count by Treatment:")
        print(treatment_summary['SEX'])

    # AE comparison if available
    if 'adae' in result.datasets:
        adae = result.datasets['adae']
        if 'TRT01P' in adae.columns:
            print_subheader("Adverse Events by Treatment")

            ae_summary = adae.groupby('TRT01P').agg({
                'USUBJID': 'count',
                'AETERM': 'count'
            }).rename(columns={'USUBJID': 'Total AEs', 'AETERM': 'Unique Events'})

            print(ae_summary)

    pause_for_effect(2)


def demo_export_results(result):
    """Demo: Export results"""
    print_header("Step 8: Export Results")

    print(f"Output directory: {Path.cwd().parent.parent / 'output'}")
    print(f"\nDatasets saved as CSV files:")

    pipeline = SDTMToADaMPipeline()
    output_files = list(pipeline.output_dir.glob(f"*_{result.job_id}.csv"))

    for output_file in output_files:
        file_size = output_file.stat().st_size / 1024
        print(f"  ✓ {output_file.name} ({file_size:.1f} KB)")

    # Create summary
    print_subheader("Pipeline Summary")

    summary = create_pipeline_summary(result)

    print(f"\nJob ID: {summary['job_id']}")
    print(f"Status: {summary['status']}")
    print(f"Execution Time: {summary['execution_time']:.2f} seconds")
    print(f"Datasets Generated: {summary['datasets_generated']}")

    print("\nDataset Details:")
    for dataset, details in summary['dataset_details'].items():
        print(f"  {dataset.upper():6s}: {details['rows']:6,} rows, "
              f"{details['columns']:3d} columns, "
              f"{details['memory_usage_mb']:6.2f} MB")

    pause_for_effect(1)


def demo_pandas_workflow():
    """Demo: Custom Pandas workflow"""
    print_header("Step 9: Custom Analysis with Pandas")

    print("Running quick pipeline for custom analysis...")
    result = run_pipeline(use_test_data=True)

    if result.status != 'success':
        print("✗ Pipeline failed")
        return

    adsl = result.datasets['adsl']

    print_subheader("Custom Analysis Example: Age Groups")

    # Create age groups
    if 'AGE' in adsl.columns:
        adsl['AGE_GROUP'] = pd.cut(
            adsl['AGE'],
            bins=[0, 40, 60, 100],
            labels=['18-40', '41-60', '61+']
        )

        print("\nAge Group Distribution:")
        age_group_dist = adsl['AGE_GROUP'].value_counts().sort_index()

        for group, count in age_group_dist.items():
            pct = count / len(adsl) * 100
            bar = "█" * int(pct / 2)
            print(f"  {group}: {count:3d} ({pct:5.1f}%) {bar}")

        # Cross-tabulation
        if 'TRT01P' in adsl.columns:
            print_subheader("Age Groups by Treatment")
            crosstab = pd.crosstab(adsl['AGE_GROUP'], adsl['TRT01P'])
            print(crosstab)

    pause_for_effect(2)


def demo_conclusion():
    """Demo conclusion"""
    print_header("Demo Complete!", "=")

    print("""
🎉 You've successfully completed the demo!

Key takeaways:
  ✓ Python wrapper provides seamless access to R-based admiral pipeline
  ✓ SDTM data easily converts to ADaM format
  ✓ Full Pandas compatibility for flexible analysis
  ✓ Automated validation and error handling
  ✓ Export ready for downstream analysis

Next steps:
  1. Load your own SDTM data using pipeline.load_sdtm_from_files()
  2. Customize the R pipeline in data-raw/create_adams_data.R
  3. Integrate with your Python backend (FastAPI, Django, etc.)
  4. Create visualizations using the ADaM datasets

For more examples, see:
  • example_usage.py - 6 detailed usage examples
  • README.md - Complete documentation
  • test_pipeline.py - Comprehensive test suite

Questions? Check the documentation or run the tests!
""")

    print(f"{'=' * 70}\n")


# =============================================================================
# MAIN DEMO EXECUTION
# =============================================================================

def main():
    """Run the complete interactive demo"""

    try:
        # Introduction
        demo_intro()

        # Environment check
        demo_environment_check()

        # Initialize pipeline
        pipeline = demo_pipeline_init()

        # Load SDTM data
        sdtm_data = demo_load_sdtm(pipeline)

        # Run transformation
        result = demo_run_pipeline(pipeline, sdtm_data)

        if result.status == 'success':
            # Explore results
            demo_explore_adsl(result)
            demo_explore_adae(result)
            demo_treatment_comparison(result)
            demo_export_results(result)
            demo_pandas_workflow()

        # Conclusion
        demo_conclusion()

    except KeyboardInterrupt:
        print("\n\n⚠ Demo interrupted by user")
    except Exception as e:
        print(f"\n\n✗ Demo failed with error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
