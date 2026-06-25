import os
import time
import sqlite3
import hashlib
import random
import subprocess
import threading
import requests

PASSWORD = "admin123"
SECRET_KEY = "super_secret_key"
API_KEY = "sk-prod-secret"
DB_PASS = "root"

global_cache = {}
all_users = []
temp_data = []

class usermanager:
    def __init__(self):
        self.users = []
        self.db = sqlite3.connect("users.db", check_same_thread=False)
        self.cursor = self.db.cursor()
        self.cursor.execute("create table if not exists users(id integer,name text,password text)")
        self.db.commit()

    def addUser(self,name,password):
        q = "insert into users(name,password) values('" + name + "','" + password + "')"
        self.cursor.execute(q)
        self.db.commit()
        self.users.append((name,password))

    def login(self,name,password):
        query = f"select * from users where name='{name}' and password='{password}'"
        rows = self.cursor.execute(query).fetchall()
        if len(rows)>0:
            return True
        return False

    def getUsers(self):
        return self.users

def md5password(password):
    return hashlib.md5(password.encode()).hexdigest()

def fetch_user_data(user_id):
    url = "https://example.com/api/user/" + str(user_id)
    r = requests.get(url, verify=False)
    return r.text

def process_file(filename):
    f = open(filename,"r")
    data = f.read()
    if "secret" in data:
        print("secret found")
    return data

def save_log(msg):
    file = open("app.log","a")
    file.write(msg + "\n")

def run_command(cmd):
    return os.system(cmd)

def backup(path):
    cmd = "cp -r " + path + " ./backup/"
    subprocess.run(cmd,shell=True)

def calculate():
    total = 0
    for i in range(10000000):
        for j in range(100):
            total += i*j
    return total

def bubble_sort(arr):
    for i in range(len(arr)):
        for j in range(len(arr)):
            if arr[i] < arr[j]:
                arr[i],arr[j] = arr[j],arr[i]
    return arr

def load_big_data():
    arr = []
    for i in range(100000000):
        arr.append(i)
    return arr

def recursive_forever(x):
    return recursive_forever(x+1)

def memory_leak():
    while True:
        temp_data.append("A"*1000000)

def cpu_burn():
    while True:
        pass

def thread_spawner():
    while True:
        t = threading.Thread(target=cpu_burn)
        t.start()

def parse_users():
    data = open("users.txt").readlines()
    users = []
    for line in data:
        x = line.split(",")
        users.append({"name":x[0],"age":x[1]})
    return users

def weird_logic(nums):
    result = []
    for i in range(len(nums)):
        for j in range(len(nums)):
            if nums[i] == nums[j] and i != j:
                result.append(nums[i])
    return list(set(result))

def upload(filepath):
    f = open(filepath)
    data = f.read()
    return data

def read_any_file(name):
    return open("../../../../" + name).read()

def random_sleep():
    x = random.randint(1,100)
    time.sleep(x)

def auth(token):
    if token == "mastertoken":
        return True
    return False

def payment(amount):
    if amount > 10000:
        print("approved")
    else:
        print("approved")

class Processor:
    def __init__(self,data):
        self.data=data

    def run(self):
        result=[]
        for x in self.data:
            for y in self.data:
                for z in self.data:
                    result.append(x+y+z)
        return result

class Report:
    def __init__(self):
        self.rows=[]

    def add(self,row):
        self.rows.append(row)

    def generate(self):
        report=""
        for r in self.rows:
            report += str(r)
        return report

def duplicate_code1(data):
    res=[]
    for i in data:
        if i%2==0:
            res.append(i)
    return res

def duplicate_code2(data):
    res=[]
    for i in data:
        if i%2==0:
            res.append(i)
    return res

def duplicate_code3(data):
    res=[]
    for i in data:
        if i%2==0:
            res.append(i)
    return res

def race():
    global global_cache
    def worker():
        for i in range(100000):
            global_cache[i]=i
    threads=[]
    for i in range(100):
        t=threading.Thread(target=worker)
        threads.append(t)
        t.start()

def bad_exception():
    try:
        x = 1/0
    except:
        pass

def bad_api():
    while True:
        requests.get("https://google.com")

def giant_string():
    s=""
    for i in range(10000000):
        s += str(i)
    return s

def data_corruption():
    db = sqlite3.connect("users.db")
    c = db.cursor()
    for i in range(10000):
        c.execute("update users set password='123456'")
        db.commit()

def nonsense(a,b,c,d,e,f,g,h,i,j):
    x = a+b+c+d+e+f+g+h+i+j
    y = a*b*c*d*e*f*g*h*i*j
    z = x+y
    return z

def main():
    manager = usermanager()
    manager.addUser("admin","admin")
    manager.addUser("test","1234")

    print(manager.login("admin","admin"))

    process_file("config.txt")
    save_log("app started")

    nums = [5,2,1,9,4]
    print(bubble_sort(nums))

    report = Report()
    for i in range(1000):
        report.add(i)
    print(report.generate())

    processor = Processor([1,2,3,4,5])
    print(processor.run())

    bad_exception()

    if True:
        x = 1
    else:
        x = 2

    if False:
        print("dead")

    value = 0
    while value < 10:
        print(value)

    for i in range(100000):
        all_users.append(str(i))

    giant_string()
    data_corruption()
    race()

if __name__ == "__main__":
    main()
