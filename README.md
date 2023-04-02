# Deployment

# Real Python Tutorial
- Check out the tutorial [here](https://realpython.com/django-nginx-gunicorn/#starting-with-django-and-wsgiserver)

## Set up a new Linode (or alternative)
- Create a new linode instance, copying the dev machine public ssh key.
- SSH into new server. Create new user {john} : `adduser john`
- Copy `authorized_keys` file from .ssh to `/home/john/.ssh`
- Add {john} to sudo group : `usermod -aG sudo john`
- Change computer name to make it easier to identify where you're SSHed into
when multiple terminals are open. `sudo nano /etc/hostname` and change the name there
to your new computer name. Then `sudo nano /etc/hosts` and change the name associated
with the loopback address 127.0.0.1. Finally `sudo hostname {new computer name}`
- Exit and SSH into server as {john}
- run `sudo apt update` and `sudo apt upgrade -y`
- Ensure python3.8 is installed with `python3 --version`
- Install pip3 with `sudo apt install python3-pip`

## Acquire a domain name.
- This project used [LetsHost](https://www.letshostbilling.com/clientarea.php)
- Grab a domain name; pay for it.
- Nav to My Domains - Manage DNS and add a record, entering the domain name and IP address
- Nav to Nameservers and change them as detailed [here](https://www.letshostbilling.com/index.php?rp=/knowledgebase/39/How-do-I-edit-the-DNS-record-for-my-domain.html)
- Wait patiently for the world to notice your DNS record.

## Clone the repo
- run `git clone https://github.com/johnrearden/crossword.git`
- install python3.8-venv `sudo apt install python3.8-venv`
- create the virtual environment `python3 -m venv venv`
- Install the requirements : `pip3 install -r requirements.txt`

## Install PostgreSQL
- run `sudo apt install postgresql postgresql-contrib`
- run `sudo systemctl start postgresql.service`
- switch to the newly created postgres user - `sudo -i -u postgres`
- create a new role : `createuser --interactive`
- login and display users to ensure creation `\du`
- create the django app user in psql : `CREATE USER {architect};`
- change the new user's password : `ALTER USER {new_user} WITH PASSWORD '{new_password}'`
- set the database user's username and password in env.py
- login to postgres - `sudo -i -u postgres`
- create the database : `CREATE DATABASE crosswordbackend WITH OWNER={architect};`
- exit from postgres shell and run database migrations : `python3 manage.py migrate`
- Good to go!

## Populate the database
- In the project's root directory, enter the Django shell : `python3 manage.py shell`
- Import the db_filler module : `from data_ore import db_filler`
- Fill that db! : `db_filler.fill()`