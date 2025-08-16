import sqlite3
import os

# Use a path relative to this file so this script works regardless of the user's home directory
db_path = os.path.join(os.path.dirname(__file__), 'instance', 'blog.sqlite')
db_abs_path = os.path.abspath(db_path)
conn = sqlite3.connect(db_abs_path)
cursor = conn.cursor()

try:
    cursor.execute('SELECT id, title FROM blogs')
    rows = cursor.fetchall()
    if not rows:
        print('No blogs found in database.')
    else:
        for row in rows:
            print(f'id: {row[0]}, title: {row[1]}')
finally:
    conn.close()
