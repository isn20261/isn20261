from boto3.dynamodb.conditions import Key
from shared.db import users, email_to_sub, logs
from post_confirm import handler


def _signup_event(sub="user-1", email="a@b.com", name=None):
    attrs = {"sub": sub, "email": email}
    if name is not None:
        attrs["name"] = name
    return {
        "triggerSource": "PostConfirmation_ConfirmSignUp",
        "request": {"userAttributes": attrs},
    }


def test_happy_path_without_name():
    event = _signup_event(sub="user-1", email="a@b.com")

    result = handler(event, None)

    assert result is event  # contract: return event unchanged
    user = users().get_item(Key={"sub": "user-1"})["Item"]
    assert user["email"] == "a@b.com"
    assert user["preferences"] == {}
    assert user["watchLater"] == []
    assert "name" not in user
    assert "createdAt" in user

    mapping = email_to_sub().get_item(Key={"email": "a@b.com"})["Item"]
    assert mapping["sub"] == "user-1"

    log_items = logs().query(KeyConditionExpression=Key("sub").eq("user-1"))["Items"]
    assert len(log_items) == 1
    assert log_items[0]["action"] == "REGISTER"
    assert log_items[0]["metadata"] == {"email": "a@b.com"}


def test_happy_path_with_name():
    event = _signup_event(sub="user-2", email="b@c.com", name="Alice")

    handler(event, None)

    user = users().get_item(Key={"sub": "user-2"})["Item"]
    assert user["name"] == "Alice"


def test_re_trigger_is_idempotent():
    event = _signup_event(sub="user-3", email="c@d.com")

    handler(event, None)
    handler(event, None)  # second call must not duplicate

    user = users().get_item(Key={"sub": "user-3"})["Item"]
    assert user["email"] == "c@d.com"

    log_items = logs().query(KeyConditionExpression=Key("sub").eq("user-3"))["Items"]
    assert len(log_items) == 1  # only one REGISTER, not two


def test_wrong_trigger_source_is_noop():
    event = {
        "triggerSource": "PostConfirmation_ConfirmForgotPassword",
        "request": {"userAttributes": {"sub": "user-4", "email": "d@e.com"}},
    }

    result = handler(event, None)

    assert result is event
    assert "Item" not in users().get_item(Key={"sub": "user-4"})
    assert "Item" not in email_to_sub().get_item(Key={"email": "d@e.com"})


def test_missing_sub_is_noop():
    event = {
        "triggerSource": "PostConfirmation_ConfirmSignUp",
        "request": {"userAttributes": {"email": "e@f.com"}},
    }

    result = handler(event, None)

    assert result is event
    assert "Item" not in email_to_sub().get_item(Key={"email": "e@f.com"})


def test_missing_email_is_noop():
    event = {
        "triggerSource": "PostConfirmation_ConfirmSignUp",
        "request": {"userAttributes": {"sub": "user-5"}},
    }

    result = handler(event, None)

    assert result is event
    assert "Item" not in users().get_item(Key={"sub": "user-5"})


def test_name_empty_string_treated_as_absent():
    """Empty string name is coerced to None — user record has no 'name' key."""
    event = _signup_event(sub="user-6", email="f@g.com", name="")
    handler(event, None)
    user = users().get_item(Key={"sub": "user-6"})["Item"]
    assert "name" not in user
