using System.ComponentModel.DataAnnotations;

namespace MinhasFinancas.Backend.UnitTests.Common;

internal static class ValidationHelper
{
    public static IReadOnlyCollection<ValidationResult> Validate(object instance)
    {
        var context = new ValidationContext(instance);
        var results = new List<ValidationResult>();

        Validator.TryValidateObject(instance, context, results, validateAllProperties: true);
        return results;
    }
}
