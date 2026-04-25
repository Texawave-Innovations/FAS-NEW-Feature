import sys

file_path = 'd:\\TEXAWAVE\\FAS\\FAS-ERP\\fas39\\src\\modules\\sales\\Gp.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('NRGP', 'RGP')
text = text.replace('nrgp', 'rgp')
text = text.replace('Non-Returnable', 'Returnable')
text = text.replace('Non Returnable', 'Returnable')
text = text.replace('NON-RETURNABLE', 'RETURNABLE')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)
print("Done")
