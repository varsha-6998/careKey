import secrets


def generate_medical_id() -> str:
    """Format matching the existing frontend: CK- followed by 8 hex characters."""
    return f"CK-{secrets.token_hex(4).upper()}"
