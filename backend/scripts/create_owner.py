# backend/scripts/create_owner.py
"""
Bootstrap a platform owner account.

Usage (inside the api container):
    python -m scripts.create_owner --email owner@kronos.io --password "s3cret!" --name "Jane Doe"

Or via docker compose from the host:
    docker compose exec api python -m scripts.create_owner \
        --email owner@kronos.io --password "s3cret!" --name "Jane Doe"
"""
from __future__ import annotations

import argparse
import asyncio
import sys

from app.database import AsyncSessionLocal
from app.services.owner_service import OwnerError, create_owner


async def main(email: str, password: str, full_name: str) -> int:
    async with AsyncSessionLocal() as session:
        try:
            owner = await create_owner(
                session, email=email, password=password, full_name=full_name
            )
        except OwnerError as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 1
    print(f"created owner {owner.email} (id={owner.id})")
    return 0


def cli() -> None:
    parser = argparse.ArgumentParser(description="Create a Kronos platform owner.")
    parser.add_argument("--email", required=True, help="Owner email address")
    parser.add_argument("--password", required=True, help="Owner password (min 8 chars)")
    parser.add_argument("--name", required=True, help="Full name")
    args = parser.parse_args()

    if len(args.password) < 8:
        print("error: password must be at least 8 characters", file=sys.stderr)
        sys.exit(2)

    code = asyncio.run(main(args.email, args.password, args.name))
    sys.exit(code)


if __name__ == "__main__":
    cli()
