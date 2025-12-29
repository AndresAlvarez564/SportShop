"""
Utilidades para manejo de fechas y horas en zona horaria de Bolivia (BOT - UTC-4)
"""
from datetime import datetime, timezone, timedelta

# Zona horaria de Bolivia (UTC-4, sin cambio de horario)
BOLIVIA_TZ = timezone(timedelta(hours=-4))

def get_bolivia_now():
    """
    Obtiene la fecha y hora actual en zona horaria de Bolivia
    Returns: datetime object con timezone Bolivia
    """
    return datetime.now(BOLIVIA_TZ)

def get_bolivia_now_iso():
    """
    Obtiene la fecha y hora actual en Bolivia como string ISO
    Returns: string en formato ISO con timezone
    """
    return get_bolivia_now().isoformat()

def get_bolivia_date_string():
    """
    Obtiene solo la fecha actual en Bolivia
    Returns: string en formato DD/MM/YYYY
    """
    return get_bolivia_now().strftime('%d/%m/%Y')

def get_bolivia_time_string():
    """
    Obtiene solo la hora actual en Bolivia
    Returns: string en formato HH:MM:SS
    """
    return get_bolivia_now().strftime('%H:%M:%S')

def get_bolivia_datetime_string():
    """
    Obtiene fecha y hora en formato legible para Bolivia
    Returns: string en formato DD/MM/YYYY HH:MM:SS
    """
    return get_bolivia_now().strftime('%d/%m/%Y %H:%M:%S')

def utc_to_bolivia(utc_datetime_str):
    """
    Convierte una fecha UTC string a zona horaria de Bolivia
    Args: utc_datetime_str - string en formato ISO UTC
    Returns: datetime object en zona horaria Bolivia
    """
    if isinstance(utc_datetime_str, str):
        # Parsear string UTC
        utc_dt = datetime.fromisoformat(utc_datetime_str.replace('Z', '+00:00'))
    else:
        utc_dt = utc_datetime_str
    
    # Convertir a zona horaria Bolivia
    return utc_dt.astimezone(BOLIVIA_TZ)

def format_bolivia_datetime(dt_string, format_type='full'):
    """
    Formatea una fecha/hora para mostrar en zona horaria Bolivia
    Args: 
        dt_string - string de fecha en cualquier formato
        format_type - 'full', 'date', 'time', 'short'
    Returns: string formateado en zona horaria Bolivia
    """
    try:
        # Convertir a Bolivia timezone
        bolivia_dt = utc_to_bolivia(dt_string)
        
        if format_type == 'full':
            return bolivia_dt.strftime('%d/%m/%Y %H:%M:%S BOT')
        elif format_type == 'date':
            return bolivia_dt.strftime('%d/%m/%Y')
        elif format_type == 'time':
            return bolivia_dt.strftime('%H:%M:%S')
        elif format_type == 'short':
            return bolivia_dt.strftime('%d/%m/%Y %H:%M')
        else:
            return bolivia_dt.strftime('%d/%m/%Y %H:%M:%S')
    except:
        return dt_string  # Fallback si hay error

# Ejemplos de uso:
if __name__ == "__main__":
    print(f"Hora actual Bolivia: {get_bolivia_now_iso()}")
    print(f"Fecha Bolivia: {get_bolivia_date_string()}")
    print(f"Hora Bolivia: {get_bolivia_time_string()}")
    print(f"Fecha y hora legible: {get_bolivia_datetime_string()}")