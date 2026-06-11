# Setup And Validation

## Create A Local Environment

From the repository root:

```bash
python -m venv venv
```

Activate it on Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Required Local Files

The pipeline expects these local files, which are intentionally ignored by Git:

- `.env`
- `credentials.json`

The `.env` file can include:

```text
OPENAI_API_KEY=your_api_key
```

The pipeline still works without `OPENAI_API_KEY`; it will use the fallback summary.

## Validate The Project

Compile Python files:

```bash
python -m compileall src tests
```

Run unit tests:

```bash
python -m unittest discover -s tests
```

Run the current interactive pipeline:

```bash
python -m src.pipeline.run_pipeline
```

## Current Environment Note

If `venv` cannot import packages such as `pandas`, reinstall dependencies with:

```bash
python -m pip install -r requirements.txt
```
