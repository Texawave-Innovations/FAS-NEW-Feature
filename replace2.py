import sys

file_path = 'd:\\TEXAWAVE\\FAS\\FAS-ERP\\fas39\\src\\modules\\sales\\Gp.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('NonReturnableGatePass', 'ReturnableGatePass')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)
print("Done")
