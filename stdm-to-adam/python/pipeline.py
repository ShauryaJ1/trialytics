"""
SDTM to ADaM Pipeline - Python Wrapper
Uses rpy2 to execute R-based transformation pipeline
"""

import os
from pathlib import Path
from typing import Dict, List, Optional, Union
import pandas as pd
from dataclasses import dataclass
from datetime import datetime

import rpy2.robjects as ro
from rpy2.robjects import pandas2ri
from rpy2.robjects.packages import importr
from rpy2.robjects.conversion import localconverter

# pandas2ri converter (use with context manager)
pandas_converter = pandas2ri.converter


@dataclass
class PipelineResult:
    """Results from pipeline execution"""
    job_id: str
    status: str  # 'success', 'failed'
    datasets: Dict[str, pd.DataFrame]
    metadata: Dict[str, any]
    error_message: Optional[str] = None
    execution_time: Optional[float] = None


class SDTMToADaMPipeline:
    """
    Python wrapper for SDTM → ADaM transformation pipeline.

    Executes R-based admiral pipeline and provides Python-friendly interface.

    Usage:
        pipeline = SDTMToADaMPipeline()
        result = pipeline.run(sdtm_data={'dm': dm_df, 'ex': ex_df, 'ae': ae_df})
        adsl = result.datasets['adsl']
    """

    def __init__(self, r_pipeline_dir: Optional[str] = None):
        """
        Initialize the pipeline wrapper.

        Args:
            r_pipeline_dir: Path to R pipeline directory (default: ../data-raw)
        """
        # Set up paths
        self.base_dir = Path(__file__).parent.parent
        self.r_pipeline_dir = Path(r_pipeline_dir) if r_pipeline_dir else self.base_dir / "data-raw"
        self.data_dir = self.base_dir / "data"
        self.output_dir = self.base_dir / "output"
        self.metadata_file = self.base_dir / "inst" / "extdata" / "adams-specs.xlsx"

        # Ensure directories exist
        self.output_dir.mkdir(exist_ok=True)
        self.data_dir.mkdir(exist_ok=True)

        # Initialize R environment
        self._setup_r_environment()

    def _py_to_r(self, df: pd.DataFrame):
        """Convert Pandas DataFrame to R data.frame"""
        with localconverter(ro.default_converter + pandas_converter):
            return ro.conversion.py2rpy(df)

    def _r_to_py(self, r_obj):
        """Convert R object to Pandas DataFrame"""
        with localconverter(ro.default_converter + pandas_converter):
            return ro.conversion.rpy2py(r_obj)

    def _setup_r_environment(self):
        """Set up R environment and load required packages"""
        print("Setting up R environment...")

        # Set working directory
        ro.r(f'setwd("{self.r_pipeline_dir}")')

        # Load required R packages
        try:
            self.r_base = importr('base')
            self.r_utils = importr('utils')

            # Try to load pharmaverse packages
            print("Loading pharmaverse packages...")
            self.admiral = importr('admiral')
            self.pharmaversesdtm = importr('pharmaversesdtm')
            self.dplyr = importr('dplyr')
            self.lubridate = importr('lubridate')

            print("✓ R environment ready")

        except Exception as e:
            print(f"Warning: Some R packages not loaded: {e}")
            print("You may need to run: Rscript install_packages.R")

    def load_sdtm_test_data(self) -> Dict[str, pd.DataFrame]:
        """
        Load test SDTM data from pharmaversesdtm package.

        Returns:
            Dictionary of SDTM datasets as Pandas DataFrames
        """
        print("Loading SDTM test data from pharmaversesdtm...")

        # Load R datasets
        ro.r('data("dm", package = "pharmaversesdtm")')
        ro.r('data("ex", package = "pharmaversesdtm")')
        ro.r('data("ae", package = "pharmaversesdtm")')
        ro.r('data("vs", package = "pharmaversesdtm")')
        ro.r('data("lb", package = "pharmaversesdtm")')

        # Convert to Pandas
        sdtm_data = {
            'dm': self._r_to_py(ro.r['dm']),
            'ex': self._r_to_py(ro.r['ex']),
            'ae': self._r_to_py(ro.r['ae']),
            'vs': self._r_to_py(ro.r['vs']),
            'lb': self._r_to_py(ro.r['lb'])
        }

        print(f"✓ Loaded {len(sdtm_data)} SDTM datasets")
        for name, df in sdtm_data.items():
            print(f"  - {name.upper()}: {len(df)} records")

        return sdtm_data

    def load_sdtm_from_files(self, file_paths: Dict[str, str]) -> Dict[str, pd.DataFrame]:
        """
        Load SDTM data from CSV or SAS files.

        Args:
            file_paths: Dictionary mapping dataset names to file paths
                       e.g., {'dm': '/path/to/dm.csv', 'ae': '/path/to/ae.sas7bdat'}

        Returns:
            Dictionary of SDTM datasets as Pandas DataFrames
        """
        sdtm_data = {}

        for dataset_name, file_path in file_paths.items():
            file_path = Path(file_path)

            if not file_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")

            # Load based on file extension
            if file_path.suffix.lower() == '.csv':
                df = pd.read_csv(file_path)
            elif file_path.suffix.lower() in ['.sas7bdat', '.sas']:
                # Use pyreadstat or R's haven package
                ro.r(f'{dataset_name}_r <- haven::read_sas("{file_path}")')
                df = self._r_to_py(ro.r[f'{dataset_name}_r'])
            else:
                raise ValueError(f"Unsupported file format: {file_path.suffix}")

            sdtm_data[dataset_name] = df
            print(f"✓ Loaded {dataset_name.upper()}: {len(df)} records from {file_path.name}")

        return sdtm_data

    def run(
        self,
        sdtm_data: Optional[Dict[str, pd.DataFrame]] = None,
        use_test_data: bool = False,
        datasets_to_generate: Optional[List[str]] = None
    ) -> PipelineResult:
        """
        Run the SDTM → ADaM transformation pipeline.

        Args:
            sdtm_data: Dictionary of SDTM datasets (if None, loads test data)
            use_test_data: If True, use pharmaversesdtm test data
            datasets_to_generate: List of ADaM datasets to generate
                                 (default: ['adsl', 'adae', 'advs', 'adlb'])

        Returns:
            PipelineResult with generated ADaM datasets
        """
        start_time = datetime.now()
        job_id = start_time.strftime('%Y%m%d_%H%M%S')

        print(f"\n{'='*60}")
        print(f"SDTM → ADaM Pipeline Execution")
        print(f"Job ID: {job_id}")
        print(f"{'='*60}\n")

        try:
            # Step 1: Load SDTM data
            if use_test_data or sdtm_data is None:
                sdtm_data = self.load_sdtm_test_data()

            # Step 2: Transfer SDTM data to R environment
            print("\nTransferring SDTM data to R environment...")
            for name, df in sdtm_data.items():
                ro.globalenv[name] = self._py_to_r(df)
                print(f"  ✓ {name.upper()}: {len(df)} records")

            # Step 3: Source and execute R pipeline
            print("\nExecuting R pipeline...")
            pipeline_script = self.r_pipeline_dir / "create_adams_data.R"

            if pipeline_script.exists():
                # Source the complete script
                ro.r(f'source("{pipeline_script}")')
            else:
                # Execute manual derivation if script not found
                print("  Using manual derivation (script not found)")
                self._run_manual_derivation(sdtm_data)

            # Step 4: Retrieve ADaM datasets from R
            print("\nRetrieving ADaM datasets...")
            datasets_to_get = datasets_to_generate or ['adsl', 'adae', 'advs', 'adlb']
            adam_datasets = {}

            for dataset_name in datasets_to_get:
                try:
                    r_dataset = ro.r[dataset_name]
                    py_dataset = self._r_to_py(r_dataset)
                    adam_datasets[dataset_name] = py_dataset
                    print(f"  ✓ {dataset_name.upper()}: {len(py_dataset)} records")
                except Exception as e:
                    print(f"  ✗ {dataset_name.upper()}: Not found or error - {e}")

            # Step 5: Save datasets
            print("\nSaving datasets...")
            self._save_datasets(adam_datasets, job_id)

            # Calculate execution time
            execution_time = (datetime.now() - start_time).total_seconds()

            # Create result
            result = PipelineResult(
                job_id=job_id,
                status='success',
                datasets=adam_datasets,
                metadata={
                    'sdtm_datasets': list(sdtm_data.keys()),
                    'adam_datasets': list(adam_datasets.keys()),
                    'record_counts': {name: len(df) for name, df in adam_datasets.items()},
                    'execution_time': execution_time
                },
                execution_time=execution_time
            )

            print(f"\n{'='*60}")
            print(f"✓ Pipeline completed successfully!")
            print(f"Execution time: {execution_time:.2f} seconds")
            print(f"Generated {len(adam_datasets)} ADaM datasets")
            print(f"{'='*60}\n")

            return result

        except Exception as e:
            execution_time = (datetime.now() - start_time).total_seconds()

            print(f"\n{'='*60}")
            print(f"✗ Pipeline failed!")
            print(f"Error: {str(e)}")
            print(f"{'='*60}\n")

            return PipelineResult(
                job_id=job_id,
                status='failed',
                datasets={},
                metadata={'error': str(e)},
                error_message=str(e),
                execution_time=execution_time
            )

    def _run_manual_derivation(self, sdtm_data: Dict[str, pd.DataFrame]):
        """Run manual ADaM derivation if script not available"""
        print("  Running manual ADSL derivation...")

        # Simple ADSL derivation
        ro.r('''
        # Derive treatment dates from EX
        ex_dates <- ex %>%
          filter(!is.na(EXSTDTC)) %>%
          group_by(USUBJID) %>%
          summarise(
            TRTSDT = min(as.Date(EXSTDTC), na.rm = TRUE),
            TRTEDT = max(as.Date(EXENDTC), na.rm = TRUE),
            .groups = "drop"
          )

        # Create ADSL
        adsl <- dm %>%
          select(STUDYID, USUBJID, SUBJID, SITEID, AGE, SEX, RACE, COUNTRY, ARMCD, ARM) %>%
          mutate(
            TRT01P = ARM,
            TRT01A = ARM,
            TRT01PN = as.numeric(factor(ARMCD)),
            TRT01AN = as.numeric(factor(ARMCD))
          ) %>%
          left_join(ex_dates, by = "USUBJID")

        # Create ADAE
        adae <- ae %>%
          select(STUDYID, USUBJID, AESEQ, AETERM, AESTDTC, AEENDTC, AESEV, AESER) %>%
          left_join(adsl %>% select(USUBJID, TRT01P, TRTSDT, TRTEDT), by = "USUBJID") %>%
          mutate(
            ASTDT = as.Date(AESTDTC),
            AENDT = as.Date(AEENDTC),
            TRTEMFL = if_else(!is.na(ASTDT) & !is.na(TRTSDT) & ASTDT >= TRTSDT, "Y", "N")
          )
        ''')

        print("  ✓ Manual derivation complete")

    def _save_datasets(self, datasets: Dict[str, pd.DataFrame], job_id: str):
        """Save datasets to CSV and optionally RData"""
        for name, df in datasets.items():
            # Save as CSV
            csv_path = self.output_dir / f"{name}_{job_id}.csv"
            df.to_csv(csv_path, index=False)
            print(f"  ✓ Saved {csv_path.name}")

    def get_dataset_summary(self, dataset: pd.DataFrame) -> Dict:
        """Get summary statistics for a dataset"""
        return {
            'rows': len(dataset),
            'columns': len(dataset.columns),
            'column_names': list(dataset.columns),
            'dtypes': dataset.dtypes.to_dict(),
            'missing_values': dataset.isnull().sum().to_dict()
        }


# Convenience function
def run_pipeline(**kwargs) -> PipelineResult:
    """
    Convenience function to run pipeline with one line.

    Usage:
        result = run_pipeline(use_test_data=True)
        adsl = result.datasets['adsl']
    """
    pipeline = SDTMToADaMPipeline()
    return pipeline.run(**kwargs)
