import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, List
from datetime import datetime

def serialize_datetime(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

def get_db_connection():
    '''
    Get database connection using DATABASE_URL from environment
    '''
    return psycopg2.connect(os.environ['DATABASE_URL'], cursor_factory=RealDictCursor)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: MyMail API for authentication, messaging, and user management
    Args: event with httpMethod, body, queryStringParameters
          context with request_id attribute
    Returns: HTTP response dict
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    path = event.get('queryStringParameters', {}).get('action', '')
    
    try:
        if method == 'POST' and path == 'login':
            return handle_login(event)
        elif method == 'POST' and path == 'logout':
            return handle_logout(event)
        elif method == 'POST' and path == 'create_user':
            return handle_create_user(event)
        elif method == 'POST' and path == 'update_profile':
            return handle_update_profile(event)
        elif method == 'POST' and path == 'send_message':
            return handle_send_message(event)
        elif method == 'GET' and path == 'users':
            return handle_get_users(event)
        elif method == 'GET' and path == 'messages':
            return handle_get_messages(event)
        elif method == 'GET' and path == 'updates':
            return handle_get_updates(event)
        elif method == 'POST' and path == 'delete_user':
            return handle_delete_user(event)
        else:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Not found'}),
                'isBase64Encoded': False
            }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }

def handle_login(event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    email = body.get('email')
    password = body.get('password')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        "SELECT * FROM users WHERE email = %s AND password = %s",
        (email, password)
    )
    user = cur.fetchone()
    
    if user:
        now_ms = int(body.get('timestamp', 0))
        cur.execute(
            "UPDATE users SET is_online = TRUE, last_seen = %s, never_logged_in = FALSE WHERE id = %s",
            (now_ms, user['id'])
        )
        conn.commit()
        
        cur.execute("SELECT * FROM users WHERE id = %s", (user['id'],))
        updated_user = cur.fetchone()
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(dict(updated_user), default=serialize_datetime),
            'isBase64Encoded': False
        }
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 401,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Invalid credentials'}),
        'isBase64Encoded': False
    }

def handle_logout(event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    user_id = body.get('userId')
    timestamp = body.get('timestamp', 0)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        "UPDATE users SET is_online = FALSE, last_seen = %s WHERE id = %s",
        (timestamp, user_id)
    )
    conn.commit()
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True}),
        'isBase64Encoded': False
    }

def handle_create_user(event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        "INSERT INTO users (email, first_name, last_name, password, role, is_online, never_logged_in) VALUES (%s, %s, %s, %s, 'user', FALSE, TRUE) RETURNING *",
        (body['email'], body['firstName'], body['lastName'], body['password'])
    )
    user = cur.fetchone()
    conn.commit()
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(dict(user)),
        'isBase64Encoded': False
    }

def handle_update_profile(event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    user_id = body.get('userId')
    display_name = body.get('displayName')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        "UPDATE users SET display_name = %s WHERE id = %s RETURNING *",
        (display_name, user_id)
    )
    user = cur.fetchone()
    conn.commit()
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(dict(user)),
        'isBase64Encoded': False
    }

def handle_send_message(event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    from_user_id = body.get('fromUserId')
    to_user_ids = body.get('toUserIds', [])
    text = body.get('text')
    timestamp = body.get('timestamp')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        "INSERT INTO messages (from_user_id, text, timestamp) VALUES (%s, %s, %s) RETURNING id",
        (from_user_id, text, timestamp)
    )
    message_id = cur.fetchone()['id']
    
    for to_user_id in to_user_ids:
        cur.execute(
            "INSERT INTO message_recipients (message_id, to_user_id, is_read) VALUES (%s, %s, FALSE)",
            (message_id, to_user_id)
        )
    
    conn.commit()
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'id': message_id, 'success': True}),
        'isBase64Encoded': False
    }

def handle_get_users(event: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM users ORDER BY id")
    users = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps([dict(u) for u in users], default=serialize_datetime),
        'isBase64Encoded': False
    }

def handle_get_messages(event: Dict[str, Any]) -> Dict[str, Any]:
    params = event.get('queryStringParameters', {})
    user_id = params.get('userId')
    since = params.get('since', '0')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT m.id, m.from_user_id, m.text, m.timestamp,
               array_agg(mr.to_user_id) as to_user_ids
        FROM messages m
        JOIN message_recipients mr ON m.id = mr.message_id
        WHERE (m.from_user_id = %s OR mr.to_user_id = %s)
          AND m.timestamp > %s
        GROUP BY m.id, m.from_user_id, m.text, m.timestamp
        ORDER BY m.timestamp
    """, (int(user_id), int(user_id), int(since)))
    
    messages = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps([dict(m) for m in messages], default=serialize_datetime),
        'isBase64Encoded': False
    }

def handle_get_updates(event: Dict[str, Any]) -> Dict[str, Any]:
    params = event.get('queryStringParameters', {})
    user_id = params.get('userId')
    last_message_id = params.get('lastMessageId', '0')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM users ORDER BY id")
    users = cur.fetchall()
    
    cur.execute("""
        SELECT m.id, m.from_user_id, m.text, m.timestamp,
               array_agg(mr.to_user_id) as to_user_ids
        FROM messages m
        JOIN message_recipients mr ON m.id = mr.message_id
        WHERE (m.from_user_id = %s OR mr.to_user_id = %s)
          AND m.id > %s
        GROUP BY m.id, m.from_user_id, m.text, m.timestamp
        ORDER BY m.timestamp
    """, (int(user_id), int(user_id), int(last_message_id)))
    
    new_messages = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'users': [dict(u) for u in users],
            'newMessages': [dict(m) for m in new_messages]
        }, default=serialize_datetime),
        'isBase64Encoded': False
    }

def handle_delete_user(event: Dict[str, Any]) -> Dict[str, Any]:
    body = json.loads(event.get('body', '{}'))
    user_id = body.get('userId')
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("UPDATE users SET email = email || '_deleted_' || id WHERE id = %s", (user_id,))
    conn.commit()
    
    cur.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'success': True}),
        'isBase64Encoded': False
    }