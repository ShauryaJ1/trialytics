"""
Example Usage of SDTM-to-ADaM Python Pipeline

This script demonstrates how to use the Python wrapper for the R pipeline.
"""

from pipeline import SDTMToADaMPipeline, run_pipeline
from utils import validate_sdtm_dataset, validate_adam_dataset, create_pipeline_summary
import pandas as pd


def example_1_basic_usage():
    """Example 1: Basic usage with test data"""
    print("\n" + "="*60)
    print("Example 1: Basic Usage with Test Data")
    print("="*60 + "\n")

    # Simple one-liner
    result = run_pipeline(use_test_data=True)

    if result.status == 'success':
        print(f"\n✓ Pipeline completed successfully!")
        print(f"Generated {len(result.datasets)} datasets:")

        for name, df in result.datasets.items():
            print(f"  - {name.upper()}: {len(df)} rows × {len(df.columns)} columns")

        # Access specific dataset
        adsl = result.datasets['adsl']
        print(f"\nADSL Preview:")
        print(adsl[['USUBJID', 'AGE', 'SEX', 'TRT01P']].head(3))


def example_2_with_pipeline_class():
    """Example 2: Using the pipeline class directly"""
    print("\n" + "="*60)
    print("Example 2: Using Pipeline Class")
    print("="*60 + "\n")

    # Initialize pipeline
    pipeline = SDTMToADaMPipeline()

    # Load test SDTM data
    sdtm_data = pipeline.load_sdtm_test_data()

    # Validate SDTM data
    print("\nValidating SDTM data...")
    for domain, df in sdtm_data.items():
        validation = validate_sdtm_dataset(df, domain)
        status = "✓" if validation['valid'] else "✗"
        print(f"  {status} {validation['domain']}: {validation['row_count']} rows")

    # Run pipeline
    result = pipeline.run(sdtm_data=sdtm_data)

    # Validate ADaM datasets
    if result.status == 'success':
        print("\nValidating ADaM datasets...")
        for name, df in result.datasets.items():
            validation = validate_adam_dataset(df, name)
            status = "✓" if validation['valid'] else "✗"
            print(f"  {status} {validation['dataset']}: {validation['row_count']} rows")


def example_3_custom_data():
    """Example 3: Using custom SDTM data from files"""
    print("\n" + "="*60)
    print("Example 3: Loading Custom SDTM Data")
    print("="*60 + "\n")

    pipeline = SDTMToADaMPipeline()

    # Example: Load from CSV files (uncomment and modify paths)
    # file_paths = {
    #     'dm': '/path/to/dm.csv',
    #     'ex': '/path/to/ex.csv',
    #     'ae': '/path/to/ae.csv',
    #     'vs': '/path/to/vs.csv',
    #     'lb': '/path/to/lb.csv'
    # }
    # sdtm_data = pipeline.load_sdtm_from_files(file_paths)
    # result = pipeline.run(sdtm_data=sdtm_data)

    print("To use custom data:")
    print("1. Prepare SDTM datasets as CSV or SAS files")
    print("2. Create file_paths dictionary with dataset names and paths")
    print("3. Use pipeline.load_sdtm_from_files(file_paths)")
    print("4. Run pipeline with your custom data")


def example_4_pandas_workflow():
    """Example 4: Working with Pandas DataFrames"""
    print("\n" + "="*60)
    print("Example 4: Pandas DataFrame Workflow")
    print("="*60 + "\n")

    # Run pipeline
    result = run_pipeline(use_test_data=True)

    if result.status == 'success':
        # Get ADSL dataset
        adsl = result.datasets['adsl']

        # Pandas operations
        print("Treatment arm distribution:")
        print(adsl['TRT01P'].value_counts())

        print("\nAge statistics:")
        print(adsl['AGE'].describe())

        print("\nSex distribution:")
        print(adsl['SEX'].value_counts())

        # Create custom analysis
        treatment_summary = adsl.groupby('TRT01P').agg({
            'AGE': ['mean', 'std', 'count'],
            'SEX': lambda x: (x == 'F').sum()  # Count females
        })

        print("\nTreatment Summary:")
        print(treatment_summary)


def example_5_export_results():
    """Example 5: Exporting results"""
    print("\n" + "="*60)
    print("Example 5: Exporting Results")
    print("="*60 + "\n")

    result = run_pipeline(use_test_data=True)

    if result.status == 'success':
        # Results are automatically saved as CSV
        print("Datasets automatically saved to: output/")

        # Access metadata
        print(f"\nPipeline Metadata:")
        print(f"  Job ID: {result.job_id}")
        print(f"  Execution time: {result.execution_time:.2f} seconds")
        print(f"  Datasets: {', '.join(result.metadata['adam_datasets'])}")

        # Create summary
        summary = create_pipeline_summary(result)
        print(f"\nSummary:")
        for dataset, details in summary['dataset_details'].items():
            print(f"  {dataset.upper()}: {details['rows']} rows, {details['memory_usage_mb']:.2f} MB")


def example_6_error_handling():
    """Example 6: Error handling"""
    print("\n" + "="*60)
    print("Example 6: Error Handling")
    print("="*60 + "\n")

    try:
        result = run_pipeline(use_test_data=True)

        if result.status == 'failed':
            print(f"Pipeline failed: {result.error_message}")
            print(f"Metadata: {result.metadata}")
        else:
            print(f"Pipeline succeeded!")

    except Exception as e:
        print(f"Unexpected error: {e}")
        # Handle error appropriately


if __name__ == "__main__":
    """
    Run examples

    Usage:
        python example_usage.py
    """

    print("\n" + "#"*60)
    print("# SDTM-to-ADaM Pipeline Examples")
    print("#"*60)

    # Run examples
    example_1_basic_usage()
    example_2_with_pipeline_class()
    example_3_custom_data()
    example_4_pandas_workflow()
    example_5_export_results()
    example_6_error_handling()

    print("\n" + "#"*60)
    print("# All examples completed!")
    print("#"*60 + "\n")
