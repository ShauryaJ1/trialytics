"""
Utility functions for Python-R data conversion and pipeline helpers
"""

import pandas as pd
from typing import Dict, List, Union, Any
from pathlib import Path
import json

import rpy2.robjects as ro
from rpy2.robjects import pandas2ri
from rpy2.robjects.conversion import localconverter

# pandas2ri converter
pandas_converter = pandas2ri.converter


def pandas_to_r(df: pd.DataFrame, name: str = None) -> ro.DataFrame:
    """
    Convert Pandas DataFrame to R data.frame.

    Args:
        df: Pandas DataFrame to convert
        name: Optional name to assign in R global environment

    Returns:
        R DataFrame object
    """
    with localconverter(ro.default_converter + pandas_converter):
        r_df = ro.conversion.py2rpy(df)

    if name:
        ro.globalenv[name] = r_df

    return r_df


def r_to_pandas(r_obj: Union[ro.DataFrame, str]) -> pd.DataFrame:
    """
    Convert R data.frame to Pandas DataFrame.

    Args:
        r_obj: R DataFrame object or name of R variable

    Returns:
        Pandas DataFrame
    """
    if isinstance(r_obj, str):
        r_obj = ro.r[r_obj]

    with localconverter(ro.default_converter + pandas_converter):
        return ro.conversion.rpy2py(r_obj)


def load_r_dataset(dataset_name: str, package: str = None) -> pd.DataFrame:
    """
    Load an R dataset and convert to Pandas.

    Args:
        dataset_name: Name of the dataset
        package: Optional package name (e.g., 'pharmaversesdtm')

    Returns:
        Pandas DataFrame
    """
    if package:
        ro.r(f'data("{dataset_name}", package = "{package}")')
    else:
        ro.r(f'data("{dataset_name}")')

    return r_to_pandas(dataset_name)


def source_r_script(script_path: Union[str, Path]) -> None:
    """
    Source an R script file.

    Args:
        script_path: Path to R script file
    """
    script_path = Path(script_path)

    if not script_path.exists():
        raise FileNotFoundError(f"R script not found: {script_path}")

    ro.r(f'source("{script_path}")')
    print(f"✓ Sourced: {script_path.name}")


def install_r_package(package_name: str, repos: str = "https://cloud.r-project.org/") -> bool:
    """
    Install an R package from Python.

    Args:
        package_name: Name of the R package
        repos: CRAN repository URL

    Returns:
        True if successful
    """
    try:
        ro.r(f'install.packages("{package_name}", repos="{repos}")')
        print(f"✓ Installed R package: {package_name}")
        return True
    except Exception as e:
        print(f"✗ Failed to install {package_name}: {e}")
        return False


def check_r_package(package_name: str) -> bool:
    """
    Check if an R package is installed.

    Args:
        package_name: Name of the R package

    Returns:
        True if package is installed
    """
    try:
        result = ro.r(f'requireNamespace("{package_name}", quietly = TRUE)')
        if result is not None and len(result) > 0:
            return bool(result[0])
        return False
    except Exception:
        return False


def get_r_version() -> str:
    """Get R version string"""
    try:
        version = ro.r('R.version.string')
        if version is not None and len(version) > 0:
            return str(version[0])
        return "Unknown"
    except Exception:
        return "Unknown"


def validate_sdtm_dataset(df: pd.DataFrame, domain: str) -> Dict[str, Any]:
    """
    Validate SDTM dataset structure.

    Args:
        df: SDTM dataset to validate
        domain: SDTM domain code (e.g., 'DM', 'AE', 'VS')

    Returns:
        Dictionary with validation results
    """
    required_vars = {
        'DM': ['STUDYID', 'USUBJID', 'SUBJID'],
        'AE': ['STUDYID', 'USUBJID', 'AETERM', 'AESTDTC'],
        'VS': ['STUDYID', 'USUBJID', 'VSTESTCD', 'VSORRES'],
        'LB': ['STUDYID', 'USUBJID', 'LBTESTCD', 'LBORRES'],
        'EX': ['STUDYID', 'USUBJID', 'EXTRT', 'EXSTDTC']
    }

    domain_upper = domain.upper()
    required = required_vars.get(domain_upper, [])

    missing_vars = [var for var in required if var not in df.columns]
    has_errors = len(missing_vars) > 0

    return {
        'domain': domain_upper,
        'valid': not has_errors,
        'row_count': len(df),
        'column_count': len(df.columns),
        'required_variables': required,
        'missing_variables': missing_vars,
        'all_variables': list(df.columns)
    }


def validate_adam_dataset(df: pd.DataFrame, dataset: str) -> Dict[str, Any]:
    """
    Validate ADaM dataset structure.

    Args:
        df: ADaM dataset to validate
        dataset: ADaM dataset name (e.g., 'ADSL', 'ADAE')

    Returns:
        Dictionary with validation results
    """
    required_vars = {
        'ADSL': ['STUDYID', 'USUBJID', 'TRT01P', 'TRT01A'],
        'ADAE': ['STUDYID', 'USUBJID', 'AETERM', 'TRTEMFL'],
        'ADVS': ['STUDYID', 'USUBJID', 'VSTESTCD', 'AVAL'],
        'ADLB': ['STUDYID', 'USUBJID', 'LBTESTCD', 'AVAL']
    }

    dataset_upper = dataset.upper()
    required = required_vars.get(dataset_upper, [])

    missing_vars = [var for var in required if var not in df.columns]
    has_errors = len(missing_vars) > 0

    return {
        'dataset': dataset_upper,
        'valid': not has_errors,
        'row_count': len(df),
        'column_count': len(df.columns),
        'required_variables': required,
        'missing_variables': missing_vars,
        'all_variables': list(df.columns)
    }


def export_to_sas(df: pd.DataFrame, output_path: Union[str, Path]) -> None:
    """
    Export Pandas DataFrame to SAS format using R's haven package.

    Args:
        df: DataFrame to export
        output_path: Path to save SAS file
    """
    output_path = Path(output_path)

    # Convert to R
    r_df = pandas_to_r(df, name='temp_df')

    # Write using haven
    ro.r(f'haven::write_sas(temp_df, "{output_path}")')

    print(f"✓ Saved SAS file: {output_path.name}")


def load_adams_metadata(metadata_path: Union[str, Path]) -> pd.DataFrame:
    """
    Load ADaMs metadata specification from Excel.

    Args:
        metadata_path: Path to adams-specs.xlsx

    Returns:
        Pandas DataFrame with metadata
    """
    metadata_path = Path(metadata_path)

    if not metadata_path.exists():
        raise FileNotFoundError(f"Metadata file not found: {metadata_path}")

    # Use R's readxl to load
    ro.r(f'metadata <- readxl::read_excel("{metadata_path}")')
    metadata_df = r_to_pandas('metadata')

    return metadata_df


def create_pipeline_summary(result: 'PipelineResult') -> Dict[str, Any]:
    """
    Create a summary of pipeline execution results.

    Args:
        result: PipelineResult object

    Returns:
        Dictionary with summary information
    """
    summary = {
        'job_id': result.job_id,
        'status': result.status,
        'execution_time': result.execution_time,
        'datasets_generated': len(result.datasets),
        'dataset_details': {}
    }

    for name, df in result.datasets.items():
        summary['dataset_details'][name] = {
            'rows': len(df),
            'columns': len(df.columns),
            'memory_usage_mb': df.memory_usage(deep=True).sum() / 1024**2
        }

    return summary


def save_pipeline_log(result: 'PipelineResult', output_path: Union[str, Path]) -> None:
    """
    Save pipeline execution log to JSON.

    Args:
        result: PipelineResult object
        output_path: Path to save JSON log
    """
    summary = create_pipeline_summary(result)

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(summary, f, indent=2, default=str)

    print(f"✓ Saved pipeline log: {output_path.name}")
