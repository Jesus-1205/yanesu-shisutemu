from app.services.encryption_service import encrypt_value, decrypt_value


def test_encrypt_and_decrypt():
    original = "my-secret-api-key-12345"
    encrypted = encrypt_value(original)
    assert encrypted != original
    decrypted = decrypt_value(encrypted)
    assert decrypted == original


def test_encrypt_different_each_time():
    value = "same-key"
    e1 = encrypt_value(value)
    e2 = encrypt_value(value)
    assert e1 != e2
    assert decrypt_value(e1) == value
    assert decrypt_value(e2) == value


def test_decrypt_invalid_token():
    import pytest
    with pytest.raises(Exception):
        decrypt_value("this-is-not-a-valid-token")
