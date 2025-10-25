"""
SDTM to ADaM Pipeline - Python Package

Python wrapper for R-based SDTM → ADaM transformation using admiral packages.
"""

from .pipeline import SDTMToADaMPipeline, PipelineResult, run_pipeline
from .utils import (
    pandas_to_r,
    r_to_pandas,
    load_r_dataset,
    source_r_script,
    validate_sdtm_dataset,
    validate_adam_dataset,
    export_to_sas,
    load_adams_metadata
)

__version__ = "1.0.0"
__all__ = [
    'SDTMToADaMPipeline',
    'PipelineResult',
    'run_pipeline',
    'pandas_to_r',
    'r_to_pandas',
    'load_r_dataset',
    'source_r_script',
    'validate_sdtm_dataset',
    'validate_adam_dataset',
    'export_to_sas',
    'load_adams_metadata'
]
