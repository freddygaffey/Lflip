#pragma once

struct Acell
{
    float x;
    float y;
    float z;

    Acell(float X,float Y,float Z)
    {
        x=X;
        y=Y;
        z=Z; 
    }
};

Acell get_acell();