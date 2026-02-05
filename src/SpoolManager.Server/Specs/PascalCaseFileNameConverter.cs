using System.Reflection;
using TypeGen.Core.Converters;

namespace SpoolManager.Server.Specs
{
    public class PascalCaseFileNameConverter : IMemberNameConverter, ITypeNameConverter
    {
        public string Convert(string name, MemberInfo memberInfo)
        {
            if (string.IsNullOrEmpty(name)) return name;

            return ConvertTypeInvariant(name);
        }

        public string Convert(string name, Type type)
        {
            if (string.IsNullOrEmpty(name)) return name;

            return ConvertTypeInvariant(name);
        }

        private static string ConvertTypeInvariant(string name)
        {
            char reference = char.ToUpperInvariant(name[0]);
            return string.Concat(new ReadOnlySpan<char>(ref reference), name.Remove(0, 1));
        }
    }
}
