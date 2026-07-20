from time import time


with open("hash.txt","a+") as file:
    hash_start = time()
    counter = 0
    lenght = 10
    hases = []
    for i in range(0,10000000000):
        counter += 1
        i = str(i)
        base = "0"*(lenght-len(i))
        base = base + i
        hases.append(str(hash(base)))
        if counter > 100000000:
            file.writelines(hases)
            print(f"time for {(time() - hash_start)/10_000}")
            print(i)
            hases = []
            counter = 0 
            hash_start = time()

