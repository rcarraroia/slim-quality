const Index = () => {
  return (
    <div className="flex min-h-[80vh] items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-background -z-10" />
      
      <div className="text-center space-y-6 px-4">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-full bg-primary animate-pulse" />
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          Em Construção
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground max-w-md mx-auto">
          Logo teremos novidades!
        </p>
        
        <div className="pt-4">
          <p className="text-sm text-muted-foreground">
            Slim Quality - Colchões Magnéticos Terapêuticos
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
