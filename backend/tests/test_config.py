from app.core.config import Settings, get_settings


def test_cors_origin_list_parses_csv():
    settings = Settings(cors_origins="http://localhost:5173, http://localhost:3000")
    assert settings.cors_origin_list == [
        "http://localhost:5173",
        "http://localhost:3000",
    ]


def test_get_settings_cached():
    get_settings.cache_clear()
    first = get_settings()
    second = get_settings()
    assert first is second
    get_settings.cache_clear()
