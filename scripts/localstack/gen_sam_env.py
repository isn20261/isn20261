import json
import os
from pathlib import Path


def _require_non_empty(outputs: dict, key: str) -> str:
    value = str(outputs.get(key) or "").strip()
    if not value:
        raise SystemExit(f"LocalStack outputs missing required '{key}'.")
    return value


def _atomic_write(path: Path, text: str) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    outputs_path = repo_root / "volume" / "isn20261-localstack-outputs.json"

    if not outputs_path.exists():
        raise SystemExit(
            f"LocalStack outputs not found at {outputs_path}. "
            "Start LocalStack first (docker compose up) and wait for init scripts."
        )

    outputs = json.loads(outputs_path.read_text(encoding="utf-8"))

    region = outputs.get("region") or os.environ.get("AWS_DEFAULT_REGION") or "sa-east-1"
    env_name = outputs.get("env") or "dev"

    user_pool_id = _require_non_empty(outputs, "user_pool_id")
    client_id = _require_non_empty(outputs, "client_id")

    localstack_hostname = str(
        outputs.get("localstack_hostname")
        or os.environ.get("LOCALSTACK_HOSTNAME")
        or "localstack-main"
    ).strip()

    dynamodb_endpoint_url = f"http://{localstack_hostname}:4566"

    issuer = str(outputs.get("issuer") or "").strip()
    if not issuer or user_pool_id not in issuer:
        raise SystemExit(
            "LocalStack outputs look stale/inconsistent: "
            f"issuer='{issuer}' does not contain user_pool_id='{user_pool_id}'."
        )

    jwks_url = f"{issuer}/.well-known/jwks.json"

    base_env = {
        "AWS_REGION": region,
        "DYNAMODB_ENDPOINT_URL": dynamodb_endpoint_url,
        "USERS_TABLE": f"Users_{env_name}",
        "EMAIL_TO_SUB_TABLE": f"EmailToSub_{env_name}",
        "TOKENS_TABLE": f"Tokens_{env_name}",
        "HISTORICO_TABLE": f"Historico_{env_name}",
        "LOGS_TABLE": f"Logs_{env_name}",
        "COGNITO_USER_POOL_ID": user_pool_id,
        "COGNITO_CLIENT_ID": client_id,
        "COGNITO_ISSUER": issuer,
        "COGNITO_JWKS_URL": jwks_url,
        "LOCAL_DEV_SUB": _require_non_empty(outputs, "user_sub"),
    }

    sam_env = {
        "RecommendFunction": dict(base_env),
        "HistoryFunction": dict(base_env),
        "PreferencesFunction": dict(base_env),
        "WatchLaterFunction": dict(base_env),
    }

    out_dir = repo_root / "tmp"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "sam-env.json"
    _atomic_write(out_path, json.dumps(sam_env, indent=2))
    print(str(out_path))


if __name__ == "__main__":
    main()
