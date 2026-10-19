#!/usr/bin/env python3
import psutil
from datetime import datetime

hoy = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
cpu = psutil.cpu_percent(interval=1)
ram = psutil.virtual_memory().percent

archivo = open("/home/rodrigo/Escritorio/registros.csv",'a')
archivo.write(str(hoy)+","+str(cpu)+","+str(ram)+"\n")
archivo.close()



# crontab -e
#* * * * * /usr/bin/python3 "/var/www/html/ceac2627dam2/006-Sistemas de gestión empresarial/003-Organización y consulta de la información/007-Herramientas de monitorización y de evaluación del rendimiento/008-preparo dos cosas para cron.py"  >/dev/null 2>&1

#* * * * * /usr/bin/python3 "/home/rodrigo/Documentos/GitHub/DAM2-Sistemas-de-gestion-empresarial/003-Organización y consulta de la información/007-Herramientas de monitorización y de evaluación del rendimiento/008 preparamos cosas para cron.py"  >/dev/null 2>&1