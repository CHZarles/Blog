import sqlite3

conn = sqlite3.connect('/home/charles/python_blog/backend/instance/blog.sqlite')
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
