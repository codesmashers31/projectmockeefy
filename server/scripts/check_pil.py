import sys
try:
    from PIL import Image
    print("PIL is available")
except ImportError:
    print("PIL not available")
