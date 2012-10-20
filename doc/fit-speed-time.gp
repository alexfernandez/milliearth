set terminal svg
set output 'speed-time-fit.svg'
set xrange [0: 400]
set yrange [0: 300]
p = 260
k = 0.01
c= 250
plot c * k * x, c, c * (1 - exp(-k * x)), sqrt(p * x)

