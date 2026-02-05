using System.Reflection;
using TypeGen.Core.Converters;
using TypeGen.Core.SpecGeneration;

namespace SpoolManager.Server.Specs
{
    public class MyGenerationSpec : GenerationSpec
    {
        public override void OnBeforeGeneration(OnBeforeGenerationArgs args)
        {

            args.GeneratorOptions.BaseOutputDirectory = "../spoolmanager.client/src/models/";
            args.GeneratorOptions.FileNameConverters = new TypeNameConverterCollection(new PascalCaseFileNameConverter());
            args.GeneratorOptions.FileHeading = "";
            args.GeneratorOptions.PropertyNameConverters = new MemberNameConverterCollection(new PascalCaseToCamelCaseConverter());

            //args.TypeResolver.Register(
            //    type => Nullable.GetUnderlyingType(type) != null,
            //    type =>
            //    {
            //        var inner = Nullable.GetUnderlyingType(type)!;
            //        return args.TypeResolver.Resolve(inner) + " | null";
            //    });

            Assembly[] currentAssemblies = AppDomain.CurrentDomain.GetAssemblies()
                            .Where(d => !string.IsNullOrEmpty(d.FullName) && d.FullName.Contains("Spool", StringComparison.OrdinalIgnoreCase)).ToArray();

            var dtosApplicationData = currentAssemblies.SelectMany(x => x.GetTypes().Where(d => d.FullName.Contains("Dto"))).Distinct().ToList();

            foreach (var dto in dtosApplicationData)
            {
                AddInterface(dto, "Dto");
            }

        }
    }
}
